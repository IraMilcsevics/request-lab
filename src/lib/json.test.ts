import { describe, expect, it } from 'vitest'
import { isValidJson, tokenizeJson } from './json'

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

describe('tokenizeJson', () => {
  it('classifies keys, strings, numbers, booleans and null', () => {
    const tokens = tokenizeJson('{"name": "Ada", "age": 42, "active": true, "nickname": null}')
    const byText = (text: string) => tokens.find((t) => t.text === text)

    expect(byText('"name":')?.type).toBe('key')
    expect(byText('"Ada"')?.type).toBe('string')
    expect(byText('42')?.type).toBe('number')
    expect(byText('true')?.type).toBe('boolean')
    expect(byText('null')?.type).toBe('null')
  })

  it('reassembles to the original text, so it is safe to render token-by-token', () => {
    const text = '{\n  "items": ["a", "b"],\n  "count": 2\n}'
    const rebuilt = tokenizeJson(text)
      .map((t) => t.text)
      .join('')
    expect(rebuilt).toBe(text)
  })

  it('treats a colon-less string as a value, not a key', () => {
    const tokens = tokenizeJson('["a", "b"]')
    expect(tokens.filter((t) => t.type === 'string')).toHaveLength(2)
    expect(tokens.some((t) => t.type === 'key')).toBe(false)
  })

  it('degrades gracefully on text that is not valid JSON yet', () => {
    // No crash, and the one recognizable token is still classified normally
    // — this is the exact shape of text mid-typing in the body editor.
    const tokens = tokenizeJson('{"name": "Ada", "age": ')
    expect(tokens.find((t) => t.text === '"name":')?.type).toBe('key')
    expect(() => tokenizeJson('{{{not json at all')).not.toThrow()
  })

  it('returns a single punctuation token for text with no JSON tokens', () => {
    expect(tokenizeJson('hello world')).toEqual([{ text: 'hello world', type: 'punctuation' }])
  })

  it('returns an empty array for empty text', () => {
    expect(tokenizeJson('')).toEqual([])
  })
})
