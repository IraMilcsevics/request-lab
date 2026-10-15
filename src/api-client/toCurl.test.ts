import { describe, expect, it } from 'vitest'
import { buildRequest } from './buildRequest'
import { toCurl } from './toCurl'
import type { RequestDraft } from './types'

function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
  return {
    method: 'POST',
    url: 'https://api.example.com/things',
    params: [],
    headers: [{ key: 'X-Trace', value: 'abc', enabled: true }],
    body: '{"a":1}',
    timeoutMs: 5000,
    ...overrides,
  }
}

describe('toCurl', () => {
  it('renders method, headers, body and url', () => {
    const built = buildRequest(draft())
    expect(built.ok).toBe(true)
    if (!built.ok) return

    // Headers normalizes names to lowercase and iterates in sorted order.
    const curl = toCurl(built.built)
    expect(curl).toBe(
      `curl -X POST -H 'content-type: application/json' -H 'x-trace: abc' -d '{"a":1}' 'https://api.example.com/things'`,
    )
  })

  it('quotes single quotes safely in header and body values', () => {
    const built = buildRequest(
      draft({ headers: [{ key: 'X-Note', value: `it's fine`, enabled: true }], body: undefined, method: 'GET' }),
    )
    expect(built.ok).toBe(true)
    if (!built.ok) return

    expect(toCurl(built.built)).toContain(`'x-note: it'\\''s fine'`)
  })
})
