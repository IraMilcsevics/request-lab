import { describe, expect, it } from 'vitest'
import { formatJson, isValidJson, tokenizeJson } from './json'

describe('formatJson', () => {
  it('pretty-prints with 2-space indent', () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
})

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
    const pretty = formatJson({ name: 'Ada', age: 42, active: true, nickname: null })
    const tokens = tokenizeJson(pretty)

    const byText = (text: string) => tokens.find((t) => t.text === text)
    expect(byText('"name":')?.type).toBe('key')
    expect(byText('"Ada"')?.type).toBe('string')
    expect(byText('42')?.type).toBe('number')
    expect(byText('true')?.type).toBe('boolean')
    expect(byText('null')?.type).toBe('null')
  })

  it('reassembles to the original text', () => {
    const pretty = formatJson({ items: ['a', 'b'], count: 2 })
    const rebuilt = tokenizeJson(pretty)
      .map((t) => t.text)
      .join('')
    expect(rebuilt).toBe(pretty)
  })

  it('treats a colon-less string as a value, not a key', () => {
    const tokens = tokenizeJson('["a", "b"]')
    expect(tokens.filter((t) => t.type === 'string')).toHaveLength(2)
    expect(tokens.some((t) => t.type === 'key')).toBe(false)
  })
})
