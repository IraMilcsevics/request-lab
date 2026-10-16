import { describe, expect, it } from 'vitest'
import { extractJsonPath } from './jsonPath'

describe('extractJsonPath', () => {
  it('reads a top-level key', () => {
    expect(extractJsonPath({ id: 42 }, 'id')).toEqual({ ok: true, value: 42 })
  })

  it('reads a nested key through dot notation', () => {
    expect(extractJsonPath({ user: { name: 'Ada' } }, 'user.name')).toEqual({ ok: true, value: 'Ada' })
  })

  it('reads an array element by bracket index', () => {
    expect(extractJsonPath({ items: ['a', 'b', 'c'] }, 'items[1]')).toEqual({ ok: true, value: 'b' })
  })

  it('reads a root-level array by a leading bracket index', () => {
    expect(extractJsonPath([{ id: 1 }, { id: 2 }], '[1].id')).toEqual({ ok: true, value: 2 })
  })

  it('reads through nested objects and arrays mixed together', () => {
    const data = { users: [{ roles: ['admin', 'editor'] }] }
    expect(extractJsonPath(data, 'users[0].roles[1]')).toEqual({ ok: true, value: 'editor' })
  })

  it('resolves a whole object or array as the value', () => {
    expect(extractJsonPath({ address: { city: 'X' } }, 'address')).toEqual({ ok: true, value: { city: 'X' } })
  })

  it('errors on a blank path', () => {
    const result = extractJsonPath({ id: 1 }, '   ')
    expect(result.ok).toBe(false)
  })

  it('errors on a missing object key', () => {
    const result = extractJsonPath({ id: 1 }, 'missing')
    expect(result).toEqual({ ok: false, error: 'No key "missing" in the response.' })
  })

  it('errors on an out-of-range array index', () => {
    const result = extractJsonPath({ items: ['a'] }, 'items[5]')
    expect(result).toEqual({ ok: false, error: 'No item at index 5 (the array has 1).' })
  })

  it('errors on a non-numeric bracket index', () => {
    const result = extractJsonPath({ items: ['a'] }, 'items[x]')
    expect(result).toEqual({ ok: false, error: 'Array index must be a number, got "x".' })
  })

  it('errors on an unclosed bracket', () => {
    const result = extractJsonPath({ items: ['a'] }, 'items[0')
    expect(result).toEqual({ ok: false, error: 'Missing a closing "]" in the path.' })
  })

  it('errors when a segment tries to read through a primitive value', () => {
    const result = extractJsonPath({ id: 1 }, 'id.nested')
    expect(result).toEqual({ ok: false, error: 'Can\'t read "nested" from a number value.' })
  })

  it('errors when a segment tries to read through null', () => {
    const result = extractJsonPath({ address: null }, 'address.city')
    expect(result).toEqual({ ok: false, error: 'Can\'t read "city" from a null value.' })
  })

  it('errors when the resolved value is undefined', () => {
    const result = extractJsonPath({ id: undefined }, 'id')
    expect(result).toEqual({ ok: false, error: 'That path resolved to undefined.' })
  })

  it('resolves a value that is explicitly null', () => {
    expect(extractJsonPath({ id: null }, 'id')).toEqual({ ok: true, value: null })
  })

  it('errors on "__proto__" rather than resolving an inherited prototype property', () => {
    const result = extractJsonPath({}, '__proto__')
    expect(result).toEqual({ ok: false, error: 'No key "__proto__" in the response.' })
  })

  it('errors on "constructor" rather than resolving an inherited prototype property', () => {
    const result = extractJsonPath({}, 'constructor')
    expect(result).toEqual({ ok: false, error: 'No key "constructor" in the response.' })
  })

  it('still resolves an own property literally named like a prototype key (JSON.parse creates a real own property, not a prototype mutation)', () => {
    const data: unknown = JSON.parse('{"__proto__":"literal-value"}')
    expect(Object.prototype.hasOwnProperty.call(data, '__proto__')).toBe(true)
    expect(extractJsonPath(data, '__proto__')).toEqual({ ok: true, value: 'literal-value' })
  })
})
