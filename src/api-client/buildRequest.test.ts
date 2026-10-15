import { describe, expect, it } from 'vitest'
import { buildRequest } from './buildRequest'
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

describe('buildRequest', () => {
  it('rejects an empty URL', () => {
    const result = buildRequest(draft({ url: '   ' }))
    expect(result).toEqual({ ok: false, error: { kind: 'invalid-request', message: 'URL is required.' } })
  })

  it('rejects a malformed URL', () => {
    const result = buildRequest(draft({ url: 'not a url' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-request')
  })

  it('rejects a non-http(s) scheme', () => {
    const result = buildRequest(draft({ url: 'ftp://example.com/file' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-request')
  })

  it('appends enabled query params and skips disabled/blank ones', () => {
    const result = buildRequest(
      draft({
        params: [
          { key: 'q', value: 'cats', enabled: true },
          { key: 'skip', value: 'me', enabled: false },
          { key: '', value: 'blank-key', enabled: true },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.built.url).toBe('https://api.example.com/things?q=cats')
    }
  })

  it('sets enabled headers on the request', () => {
    const result = buildRequest(
      draft({
        headers: [
          { key: 'X-Trace', value: 'abc', enabled: true },
          { key: 'X-Skip', value: 'me', enabled: false },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const headers = result.built.init.headers as Headers
      expect(headers.get('X-Trace')).toBe('abc')
      expect(headers.get('X-Skip')).toBeNull()
    }
  })

  it('omits the body for GET even if one is set', () => {
    const result = buildRequest(draft({ method: 'GET', body: '{"a":1}' }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.built.init.body).toBeUndefined()
  })

  it('attaches a valid JSON body for POST and defaults Content-Type', () => {
    const result = buildRequest(draft({ method: 'POST', body: '{"a":1}' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.built.init.body).toBe('{"a":1}')
      const headers = result.built.init.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
    }
  })

  it('does not override an explicit Content-Type header', () => {
    const result = buildRequest(
      draft({
        method: 'POST',
        body: '{"a":1}',
        headers: [{ key: 'Content-Type', value: 'application/vnd.api+json', enabled: true }],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const headers = result.built.init.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/vnd.api+json')
    }
  })

  it('rejects an invalid JSON body', () => {
    const result = buildRequest(draft({ method: 'POST', body: '{not json' }))
    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-json', message: 'Request body is not valid JSON.' },
    })
  })
})
