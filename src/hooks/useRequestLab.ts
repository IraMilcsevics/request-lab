import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyEnvironmentVariables, sendRequest } from '../api-client'
import type { ApiResult, KeyValue, RequestDraft } from '../api-client'
import { parseCollectionsImport, serializeCollections } from '../lib/collections'
import { createId } from '../lib/id'
import { loadFromStorage, saveToStorage } from '../lib/storage'
import { clampTimeoutMs } from '../lib/timeout'
import type {
  Collection,
  Environment,
  HistoryEntry,
  RequestTab,
  ResponseTab,
  SavedRequest,
  SendState,
  SidebarTab,
} from '../types/ui'

const HISTORY_KEY = 'requestlab:history'
const SAVED_KEY = 'requestlab:saved'
const COLLECTIONS_KEY = 'requestlab:collections'
const ENVIRONMENTS_KEY = 'requestlab:environments'
const ACTIVE_ENVIRONMENT_KEY = 'requestlab:activeEnvironmentId'
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
  const [collections, setCollections] = useState<Collection[]>(() => loadFromStorage(COLLECTIONS_KEY, []))
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>(undefined)

  const [environments, setEnvironments] = useState<Environment[]>(() => loadFromStorage(ENVIRONMENTS_KEY, []))
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | undefined>(() =>
    loadFromStorage(ACTIVE_ENVIRONMENT_KEY, undefined),
  )

  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => saveToStorage(HISTORY_KEY, history), [history])
  useEffect(() => saveToStorage(SAVED_KEY, saved), [saved])
  useEffect(() => saveToStorage(COLLECTIONS_KEY, collections), [collections])
  useEffect(() => saveToStorage(ENVIRONMENTS_KEY, environments), [environments])
  useEffect(() => saveToStorage(ACTIVE_ENVIRONMENT_KEY, activeEnvironmentId), [activeEnvironmentId])

  const activeEnvironment = environments.find((e) => e.id === activeEnvironmentId)

  // Only enabled variables with a non-blank key resolve — mirrors how
  // disabled/blank param & header rows are excluded when building a request.
  const activeVariables = useMemo(() => {
    const record: Record<string, string> = {}
    for (const v of activeEnvironment?.variables ?? []) {
      if (v.enabled && v.key.trim() !== '') record[v.key] = v.value
    }
    return record
  }, [activeEnvironment])

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
    setDraft((d) => ({ ...d, timeoutMs: clampTimeoutMs(timeoutMs, d.timeoutMs) }))
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

    // The draft in the composer may still hold {{variables}}; history
    // records the resolved draft, since that's what was actually sent.
    const resolvedDraft = applyEnvironmentVariables(draft, activeVariables)
    const res = await sendRequest(resolvedDraft, controller.signal)

    // A later send (or a loadDraft) may have started while this one was in
    // flight; only the most recent request gets to write its result.
    if (requestId !== requestIdRef.current) return

    setResult(res)
    setSendState('done')
    const entryId = createId()
    setHistory((prev) => [{ id: entryId, draft: resolvedDraft, result: res, sentAt: Date.now() }, ...prev].slice(0, MAX_HISTORY))
    setSelectedHistoryId(entryId)
  }, [draft, activeVariables])

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

  const duplicateSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index === -1) return prev
      const original = prev[index]
      const copy: SavedRequest = { id: createId(), name: `${original.name} copy`, draft: original.draft }
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]
    })
  }, [])

  const addCollection = useCallback((name: string) => {
    const trimmed = name.trim()
    if (trimmed === '') return
    setCollections((prev) => [...prev, { id: createId(), name: trimmed }])
  }, [])

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id))
    // Requests in a deleted collection aren't deleted — they just fall back
    // to "no collection", same spirit as deleting an environment.
    setSaved((prev) => prev.map((s) => (s.collectionId === id ? { ...s, collectionId: undefined } : s)))
  }, [])

  const renameCollection = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (trimmed === '') return
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)))
  }, [])

  const moveSavedToCollection = useCallback((requestId: string, collectionId: string | undefined) => {
    setSaved((prev) => prev.map((s) => (s.id === requestId ? { ...s, collectionId } : s)))
  }, [])

  const exportSaved = useCallback(() => serializeCollections(collections, saved), [collections, saved])

  const importSaved = useCallback((json: string): { ok: true } | { ok: false; error: string } => {
    const result = parseCollectionsImport(json)
    if (!result.ok) return result

    // Fresh ids for everything imported, so importing the same file twice
    // (or a file that happens to reuse ids) never collides with what's
    // already here; collectionId references are remapped to match.
    const idMap = new Map<string, string>()
    const newCollections = result.collections.map((c) => {
      const newId = createId()
      idMap.set(c.id, newId)
      return { ...c, id: newId }
    })
    const newSaved = result.saved.map((s) => ({
      ...s,
      id: createId(),
      collectionId: s.collectionId ? idMap.get(s.collectionId) : undefined,
    }))

    setCollections((prev) => [...prev, ...newCollections])
    setSaved((prev) => [...newSaved, ...prev])
    return { ok: true }
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setSelectedHistoryId(undefined)
  }, [])

  const deleteHistoryEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id))
    setSelectedHistoryId((current) => (current === id ? undefined : current))
  }, [])

  const addEnvironment = useCallback((name: string) => {
    const trimmed = name.trim()
    if (trimmed === '') return
    const id = createId()
    setEnvironments((prev) => [...prev, { id, name: trimmed, variables: [] }])
    setActiveEnvironmentId(id)
  }, [])

  const deleteEnvironment = useCallback((id: string) => {
    setEnvironments((prev) => prev.filter((env) => env.id !== id))
    setActiveEnvironmentId((current) => (current === id ? undefined : current))
  }, [])

  const renameEnvironment = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (trimmed === '') return
    setEnvironments((prev) => prev.map((env) => (env.id === id ? { ...env, name: trimmed } : env)))
  }, [])

  const setEnvironmentVariables = useCallback((id: string, variables: KeyValue[]) => {
    setEnvironments((prev) => prev.map((env) => (env.id === id ? { ...env, variables } : env)))
  }, [])

  const setActiveEnvironment = useCallback((id: string | undefined) => {
    setActiveEnvironmentId(id)
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
    collections,
    selectedHistoryId,
    environments,
    activeEnvironmentId,
    activeVariables,
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
    duplicateSaved,
    addCollection,
    deleteCollection,
    renameCollection,
    moveSavedToCollection,
    exportSaved,
    importSaved,
    clearHistory,
    deleteHistoryEntry,
    addEnvironment,
    deleteEnvironment,
    renameEnvironment,
    setEnvironmentVariables,
    setActiveEnvironment,
  }
}

export type RequestLab = ReturnType<typeof useRequestLab>
