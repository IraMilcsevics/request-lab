import { describe, expect, it } from 'vitest'
import { isValidJson } from './json'

describe('isValidJson', () => {
  it('accepts empty or blank text as valid (no body)', () => {
    expect(isValidJson('')).toBe(true)
    expect(isValidJson('   ')).toBe(true)
  })

  it('accepts well-formed JSON', () => {
    expect(isValidJson('{"a":1}')).toBe(true)
  })

  it('rejects malformed JSON', () => {
    expect(isValidJson('{a:1}')).toBe(false)
    expect(isValidJson('{"a":}')).toBe(false)
  })
})
