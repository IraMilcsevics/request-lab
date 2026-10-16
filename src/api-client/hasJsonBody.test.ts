import { describe, expect, it } from 'vitest'
import { hasJsonBody } from './hasJsonBody'
import type { ApiResult } from './types'

function ok(json?: unknown): ApiResult {
  return { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json, durationMs: 1 } }
}

describe('hasJsonBody', () => {
  it('is false for undefined', () => {
    expect(hasJsonBody(undefined)).toBe(false)
  })

  it('is false for an error result', () => {
    expect(hasJsonBody({ ok: false, error: { kind: 'network', message: 'x' } })).toBe(false)
  })

  it('is false for a successful result with no JSON body', () => {
    expect(hasJsonBody(ok(undefined))).toBe(false)
  })

  it('is true for a successful result with a JSON body, including an empty object', () => {
    expect(hasJsonBody(ok({ id: 1 }))).toBe(true)
    expect(hasJsonBody(ok({}))).toBe(true)
  })
})
