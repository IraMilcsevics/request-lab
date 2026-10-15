import { useCallback, useEffect, useRef, useState } from 'react'
import { sendRequest } from '../api-client'
import type { ApiResult, KeyValue, RequestDraft } from '../api-client'
import { createId } from '../lib/id'
import { loadFromStorage, saveToStorage } from '../lib/storage'
import type { HistoryEntry, RequestTab, ResponseTab, SavedRequest, SendState, SidebarTab } from '../types/ui'

const HISTORY_KEY = 'requestlab:history'
const SAVED_KEY = 'requestlab:saved'
const MAX_HISTORY = 25

const INITIAL_DRAFT: RequestDraft = {
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/users/1',
  params: [],
  headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
  body: '',
  timeoutMs: 8000,
}

export function useRequestLab() {
  const [draft, setDraft] = useState<RequestDraft>(INITIAL_DRAFT)
  const [result, setResult] = useState<ApiResult | undefined>(undefined)
  const [sendState, setSendState] = useState<SendState>('idle')

  const [reqTab, setReqTab] = useState<RequestTab>('params')
  const [resTab, setResTab] = useState<ResponseTab>('body')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history')
  const [filter, setFilter] = useState('')

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadFromStorage(HISTORY_KEY, []))
  const [saved, setSaved] = useState<SavedRequest[]>(() => loadFromStorage(SAVED_KEY, []))
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>(undefined)

  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => saveToStorage(HISTORY_KEY, history), [history])
  useEffect(() => saveToStorage(SAVED_KEY, saved), [saved])

  const setMethod = useCallback((method: RequestDraft['method']) => {
    setDraft((d) => ({ ...d, method }))
  }, [])
  const setUrl = useCallback((url: string) => {
    setDraft((d) => ({ ...d, url }))
  }, [])
  const setParams = useCallback((params: KeyValue[]) => {
    setDraft((d) => ({ ...d, params }))
  }, [])
  const setHeaders = useCallback((headers: KeyValue[]) => {
    setDraft((d) => ({ ...d, headers }))
  }, [])
  const setBody = useCallback((body: string) => {
    setDraft((d) => ({ ...d, body }))
  }, [])
  const setTimeoutMs = useCallback((timeoutMs: number) => {
    setDraft((d) => ({ ...d, timeoutMs }))
  }, [])

  const loadDraft = useCallback((next: RequestDraft) => {
    abortRef.current?.abort()
    setDraft(next)
    setResult(undefined)
    setSendState('idle')
  }, [])

  const send = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const requestId = ++requestIdRef.current
    setSendState('loading')
    setResult(undefined)

    const draftAtSend = draft
    const res = await sendRequest(draftAtSend, controller.signal)

    // A later send (or a loadDraft) may have started while this one was in
    // flight; only the most recent request gets to write its result.
    if (requestId !== requestIdRef.current) return

    setResult(res)
    setSendState('done')
    const entryId = createId()
    setHistory((prev) => [{ id: entryId, draft: draftAtSend, result: res, sentAt: Date.now() }, ...prev].slice(0, MAX_HISTORY))
    setSelectedHistoryId(entryId)
  }, [draft])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const loadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      loadDraft(entry.draft)
      setSelectedHistoryId(entry.id)
    },
    [loadDraft],
  )

  const loadSaved = useCallback(
    (item: SavedRequest) => {
      loadDraft(item.draft)
      setSelectedHistoryId(undefined)
    },
    [loadDraft],
  )

  const saveCurrent = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (trimmed === '') return
      setSaved((prev) => [{ id: createId(), name: trimmed, draft }, ...prev])
    },
    [draft],
  )

  const deleteSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return {
    draft,
    result,
    sendState,
    reqTab,
    resTab,
    sidebarTab,
    filter,
    history,
    saved,
    selectedHistoryId,
    setMethod,
    setUrl,
    setParams,
    setHeaders,
    setBody,
    setTimeoutMs,
    setReqTab,
    setResTab,
    setSidebarTab,
    setFilter,
    send,
    cancel,
    loadFromHistory,
    loadSaved,
    saveCurrent,
    deleteSaved,
  }
}

export type RequestLab = ReturnType<typeof useRequestLab>
