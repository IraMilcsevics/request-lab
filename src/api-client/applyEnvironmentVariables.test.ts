import { describe, expect, it } from 'vitest'
import { applyEnvironmentVariables, substituteVariables } from './applyEnvironmentVariables'
import type { RequestDraft } from './types'

describe('substituteVariables', () => {
  it('replaces a known variable', () => {
    expect(substituteVariables('{{baseUrl}}/users', { baseUrl: 'https://api.example.com' })).toBe(
      'https://api.example.com/users',
    )
  })

  it('replaces multiple occurrences and multiple variables', () => {
    expect(substituteVariables('{{a}}-{{b}}-{{a}}', { a: '1', b: '2' })).toBe('1-2-1')
  })

  it('leaves an unknown variable untouched, literal braces and all', () => {
    expect(substituteVariables('{{missing}}/x', {})).toBe('{{missing}}/x')
  })

  it('tolerates whitespace inside the braces', () => {
    expect(substituteVariables('{{ token }}', { token: 'abc' })).toBe('abc')
  })

  it('leaves text with no placeholders alone', () => {
    expect(substituteVariables('https://api.example.com/users', { baseUrl: 'x' })).toBe(
      'https://api.example.com/users',
    )
  })

  it('substitutes with an empty string when a variable is defined but blank', () => {
    expect(substituteVariables('{{token}}', { token: '' })).toBe('')
  })
})

describe('applyEnvironmentVariables', () => {
  function draft(overrides: Partial<RequestDraft> = {}): RequestDraft {
    return {
      method: 'GET',
      url: '{{baseUrl}}/users/{{id}}',
      params: [{ key: 'q', value: '{{query}}', enabled: true }],
      headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
      body: '{"id": "{{id}}"}',
      timeoutMs: 8000,
      ...overrides,
    }
  }

  const variables = { baseUrl: 'https://api.example.com', id: '42', query: 'cats', token: 'secret' }

  it('resolves variables in the URL, param values, header values and body', () => {
    const resolved = applyEnvironmentVariables(draft(), variables)

    expect(resolved.url).toBe('https://api.example.com/users/42')
    expect(resolved.params[0].value).toBe('cats')
    expect(resolved.headers[0].value).toBe('Bearer secret')
    expect(resolved.body).toBe('{"id": "42"}')
  })

  it('never substitutes inside keys', () => {
    const resolved = applyEnvironmentVariables(
      draft({ params: [{ key: '{{id}}', value: 'x', enabled: true }] }),
      variables,
    )
    expect(resolved.params[0].key).toBe('{{id}}')
  })

  it('leaves unresolved placeholders as-is when no variable matches', () => {
    const resolved = applyEnvironmentVariables(draft(), {})
    expect(resolved.url).toBe('{{baseUrl}}/users/{{id}}')
  })

  it('does not mutate the original draft', () => {
    const original = draft()
    const originalUrl = original.url
    applyEnvironmentVariables(original, variables)
    expect(original.url).toBe(originalUrl)
  })

  it('treats an undefined body the same as an empty one, rather than skipping substitution', () => {
    // Regression: body used to bypass substituteVariables entirely whenever
    // it was exactly `undefined` (vs. `''`) — a fragile distinction nothing
    // in the UI actually produces today, but any future draft missing a
    // body field would have silently stopped resolving {{vars}} in it.
    const resolved = applyEnvironmentVariables(draft({ body: undefined }), variables)
    expect(resolved.body).toBe('')
  })
})
