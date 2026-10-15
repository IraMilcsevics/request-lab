import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { sendRequest } from './sendRequest'
import type { RequestDraft } from './types'

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    method: 'GET',
    url: 'https://api.example.com/things',
    params: [],
    headers: [],
    timeoutMs: 5000,
    ...overrides,
  }
}

describe('sendRequest', () => {
  it('returns a parsed JSON response on success', async () => {
    server.use(
      http.get('https://api.example.com/things', () =>
        HttpResponse.json({ hello: 'world' }, { status: 201, statusText: 'Created' }),
      ),
    )

    const result = await sendRequest(draft())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.response.status).toBe(201)
      expect(result.response.json).toEqual({ hello: 'world' })
      expect(result.response.durationMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('still returns the raw body when the response is not JSON', async () => {
    server.use(
      http.get('https://api.example.com/things', () => new HttpResponse('plain text', { status: 200 })),
    )

    const result = await sendRequest(draft())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.response.rawBody).toBe('plain text')
      expect(result.response.json).toBeUndefined()
    }
  })

  it('reports a network error distinctly', async () => {
    server.use(http.get('https://api.example.com/things', () => HttpResponse.error()))

    const result = await sendRequest(draft())

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('network')
  })

  it('reports a request-building error without hitting the network', async () => {
    const result = await sendRequest(draft({ url: 'not a url' }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-request')
  })

  it('reports a timeout when the server is slower than the timeout', async () => {
    server.use(
      http.get('https://api.example.com/things', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({})
      }),
    )

    const result = await sendRequest(draft({ timeoutMs: 5 }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('timeout')
  })

  it('reports an aborted request when the caller cancels it', async () => {
    server.use(
      http.get('https://api.example.com/things', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({})
      }),
    )

    const controller = new AbortController()
    const resultPromise = sendRequest(draft(), controller.signal)
    controller.abort()
    const result = await resultPromise

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('aborted')
  })
})
