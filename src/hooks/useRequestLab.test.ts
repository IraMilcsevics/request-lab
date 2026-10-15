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

  it('duplicateSaved inserts a named copy right after the original, sharing its draft', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.setUrl('https://api.example.com/users/1'))
    act(() => result.current.saveCurrent('Get user'))
    act(() => result.current.saveCurrent('Unrelated'))
    expect(result.current.saved.map((s) => s.name)).toEqual(['Unrelated', 'Get user'])

    const original = result.current.saved.find((s) => s.name === 'Get user')!
    act(() => result.current.duplicateSaved(original.id))

    expect(result.current.saved.map((s) => s.name)).toEqual(['Unrelated', 'Get user', 'Get user copy'])
    const copy = result.current.saved[2]
    expect(copy.id).not.toBe(original.id)
    expect(copy.draft).toEqual(original.draft)
  })

  it('duplicateSaved is a no-op for an id that no longer exists', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.saveCurrent('One'))

    act(() => result.current.duplicateSaved('does-not-exist'))

    expect(result.current.saved).toHaveLength(1)
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

describe('useRequestLab — environments', () => {
  it('starts with no environments and nothing active', () => {
    const { result } = renderHook(() => useRequestLab())
    expect(result.current.environments).toEqual([])
    expect(result.current.activeEnvironmentId).toBeUndefined()
    expect(result.current.activeVariables).toEqual({})
  })

  it('addEnvironment creates and activates a new, empty environment', () => {
    const { result } = renderHook(() => useRequestLab())

    act(() => result.current.addEnvironment('Local'))

    expect(result.current.environments).toHaveLength(1)
    expect(result.current.environments[0].name).toBe('Local')
    expect(result.current.environments[0].variables).toEqual([])
    expect(result.current.activeEnvironmentId).toBe(result.current.environments[0].id)
  })

  it('ignores a blank environment name', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('   '))
    expect(result.current.environments).toEqual([])
  })

  it('setEnvironmentVariables updates only that environment, and activeVariables reflects enabled rows', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))
    const id = result.current.environments[0].id

    act(() =>
      result.current.setEnvironmentVariables(id, [
        { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
        { key: 'disabled', value: 'nope', enabled: false },
      ]),
    )

    expect(result.current.activeVariables).toEqual({ baseUrl: 'https://api.example.com' })
  })

  it('renameEnvironment updates the name; ignores a blank one', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))
    const id = result.current.environments[0].id

    act(() => result.current.renameEnvironment(id, 'Production'))
    expect(result.current.environments[0].name).toBe('Production')

    act(() => result.current.renameEnvironment(id, '   '))
    expect(result.current.environments[0].name).toBe('Production')
  })

  it('deleteEnvironment removes it and clears the active selection if it was active', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))
    const id = result.current.environments[0].id
    expect(result.current.activeEnvironmentId).toBe(id)

    act(() => result.current.deleteEnvironment(id))

    expect(result.current.environments).toEqual([])
    expect(result.current.activeEnvironmentId).toBeUndefined()
  })

  it('setActiveEnvironment switches back to "no environment" with undefined', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))

    act(() => result.current.setActiveEnvironment(undefined))

    expect(result.current.activeEnvironmentId).toBeUndefined()
    expect(result.current.activeVariables).toEqual({})
  })

  it('persists environments and the active id to localStorage', () => {
    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))

    const storedEnvs = JSON.parse(localStorage.getItem('requestlab:environments') ?? '[]')
    expect(storedEnvs).toHaveLength(1)
    expect(localStorage.getItem('requestlab:activeEnvironmentId')).toBe(JSON.stringify(result.current.environments[0].id))
  })

  it('send() resolves {{variables}} against the active environment before the request goes out, and records the resolved URL in history', async () => {
    server.use(http.get('https://api.example.com/users/1', () => HttpResponse.json({ ok: true })))

    const { result } = renderHook(() => useRequestLab())
    act(() => result.current.addEnvironment('Local'))
    const id = result.current.environments[0].id
    act(() =>
      result.current.setEnvironmentVariables(id, [{ key: 'base', value: 'https://api.example.com', enabled: true }]),
    )
    act(() => result.current.setUrl('{{base}}/users/1'))

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))

    expect(result.current.result?.ok).toBe(true)
    // The composer keeps the raw template...
    expect(result.current.draft.url).toBe('{{base}}/users/1')
    // ...but history records what was actually sent.
    expect(result.current.history[0].draft.url).toBe('https://api.example.com/users/1')
  })

  it('send() leaves placeholders unresolved when no environment is active', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ ok: true })))
    const { result } = renderHook(() => useRequestLab())

    act(() => {
      void result.current.send()
    })
    await waitFor(() => expect(result.current.sendState).toBe('done'))

    expect(result.current.result?.ok).toBe(true)
  })
})
