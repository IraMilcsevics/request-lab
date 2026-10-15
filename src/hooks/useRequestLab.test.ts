import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { useRequestLab } from './useRequestLab'

const DEMO_URL = 'https://jsonplaceholder.typicode.com/users/1'

beforeEach(() => {
  localStorage.clear()
})

describe('useRequestLab — initial state', () => {
  it('starts idle with the default demo request and no history/saved', () => {
    const { result } = renderHook(() => useRequestLab())

    expect(result.current.draft.method).toBe('GET')
    expect(result.current.draft.url).toBe(DEMO_URL)
    expect(result.current.sendState).toBe('idle')
    expect(result.current.result).toBeUndefined()
    expect(result.current.history).toEqual([])
    expect(result.current.saved).toEqual([])
  })
})

describe('useRequestLab — send', () => {
  it('goes idle -> loading -> done and records a history entry', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    expect(result.current.sendState).toBe('loading')

    await waitFor(() => expect(result.current.sendState).toBe('done'))

    expect(result.current.result?.ok).toBe(true)
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].draft.url).toBe(DEMO_URL)
    expect(result.current.selectedHistoryId).toBe(result.current.history[0].id)
  })

  it('persists history to localStorage', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))

    const stored = JSON.parse(localStorage.getItem('requestlab:history') ?? '[]')
    expect(stored).toHaveLength(1)
  })

  it('caps history at 25 entries', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    for (let i = 0; i < 27; i++) {
      act(() => {
        void result.current.send()
      })
      await waitFor(() => expect(result.current.sendState).toBe('done'))
    }

    expect(result.current.history).toHaveLength(25)
  })

  it('only keeps the most recent send’s result when a second send overtakes the first', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      // Neither send is awaited individually — the second starts (and
      // aborts the first) before the first's response ever arrives.
      void result.current.send()
    })
    act(() => {
      void result.current.send()
    })

    await waitFor(() => expect(result.current.sendState).toBe('done'))

    // The superseded first request must never be allowed to overwrite the
    // second's outcome, even as an "aborted" flash.
    expect(result.current.result?.ok).toBe(true)
    expect(result.current.history).toHaveLength(1)
  })
})

describe('useRequestLab — cancel', () => {
  it('aborts the in-flight request and surfaces it as a cancelled result', async () => {
    server.use(
      http.get(DEMO_URL, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({ id: 1 })
      }),
    )
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    expect(result.current.sendState).toBe('loading')

    act(() => {
      result.current.cancel()
    })

    await waitFor(() => expect(result.current.sendState).toBe('done'))
    expect(result.current.result?.ok).toBe(false)
    if (!result.current.result?.ok) {
      expect(result.current.result?.error.kind).toBe('aborted')
    }
  })
})

describe('useRequestLab — draft setters', () => {
  it('updates individual draft fields', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.setMethod('POST'))
    expect(result.current.draft.method).toBe('POST')

    act(() => result.current.setUrl('https://example.com/x'))
    expect(result.current.draft.url).toBe('https://example.com/x')

    act(() => result.current.setBody('{"a":1}'))
    expect(result.current.draft.body).toBe('{"a":1}')

    act(() => result.current.setParams([{ key: 'q', value: '1', enabled: true }]))
    expect(result.current.draft.params).toHaveLength(1)

    act(() => result.current.setHeaders([{ key: 'X', value: '1', enabled: true }]))
    expect(result.current.draft.headers).toHaveLength(1)
  })

  it('clamps the timeout instead of accepting any number', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.setTimeoutMs(999_999))
    expect(result.current.draft.timeoutMs).toBe(60_000)

    act(() => result.current.setTimeoutMs(Number.NaN))
    expect(result.current.draft.timeoutMs).toBe(60_000) // falls back to the previous value
  })
})

describe('useRequestLab — history and saved requests', () => {
  it('loading a history entry resets the result and sendState, and restores its draft', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))

    act(() => result.current.setUrl('https://example.com/changed'))
    const entry = result.current.history[0]

    act(() => result.current.loadFromHistory(entry))

    expect(result.current.draft.url).toBe(entry.draft.url)
    expect(result.current.sendState).toBe('idle')
    expect(result.current.result).toBeUndefined()
    expect(result.current.selectedHistoryId).toBe(entry.id)
  })

  it('ignores a blank name when saving the current request', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.saveCurrent('   '))
    expect(result.current.saved).toHaveLength(0)

    act(() => result.current.saveCurrent('My request'))
    expect(result.current.saved).toHaveLength(1)
    expect(result.current.saved[0].name).toBe('My request')
  })

  it('loading a saved request clears the selected history id', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))
    expect(result.current.selectedHistoryId).toBeDefined()

    act(() => result.current.saveCurrent('Saved one'))
    act(() => result.current.loadSaved(result.current.saved[0]))

    expect(result.current.selectedHistoryId).toBeUndefined()
  })

  it('deletes a saved request by id', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.saveCurrent('One'))
    act(() => result.current.saveCurrent('Two'))
    expect(result.current.saved).toHaveLength(2)

    const idToDelete = result.current.saved[0].id
    act(() => result.current.deleteSaved(idToDelete))

    expect(result.current.saved).toHaveLength(1)
    expect(result.current.saved.find((s) => s.id === idToDelete)).toBeUndefined()
  })

  it('clearHistory empties the list and the current selection, and persists it', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))
    expect(result.current.history).toHaveLength(1)
    expect(result.current.selectedHistoryId).toBeDefined()

    act(() => result.current.clearHistory())

    expect(result.current.history).toEqual([])
    expect(result.current.selectedHistoryId).toBeUndefined()
    expect(JSON.parse(localStorage.getItem('requestlab:history') ?? '[]')).toEqual([])
  })

  it('deleteHistoryEntry removes just that entry and clears the selection only if it was selected', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1 })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))
    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.history).toHaveLength(2))

    const [latest, older] = result.current.history
    expect(result.current.selectedHistoryId).toBe(latest.id)

    // Deleting an entry that is NOT selected leaves the selection alone.
    act(() => result.current.deleteHistoryEntry(older.id))
    expect(result.current.history).toHaveLength(1)
    expect(result.current.selectedHistoryId).toBe(latest.id)

    // Deleting the SELECTED entry clears the selection too.
    act(() => result.current.deleteHistoryEntry(latest.id))
    expect(result.current.history).toHaveLength(0)
    expect(result.current.selectedHistoryId).toBeUndefined()
  })
})
