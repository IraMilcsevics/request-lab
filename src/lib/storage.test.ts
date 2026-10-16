import { beforeEach, describe, expect, it } from 'vitest'
import { loadFromStorage, saveToStorage } from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('loadFromStorage', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadFromStorage('k', [1, 2])).toEqual([1, 2])
  })

  it('returns the fallback for syntactically invalid JSON', () => {
    localStorage.setItem('k', '{not json')
    expect(loadFromStorage('k', [] as number[])).toEqual([])
  })

  it('round-trips a value written by saveToStorage', () => {
    saveToStorage('k', [{ a: 1 }])
    expect(loadFromStorage('k', [] as Array<{ a: number }>)).toEqual([{ a: 1 }])
  })

  it('falls back to [] when an array was expected but the stored value is a scalar', () => {
    localStorage.setItem('k', '42')
    expect(loadFromStorage('k', [] as number[])).toEqual([])
  })

  it('falls back to [] when an array was expected but the stored value is an object', () => {
    localStorage.setItem('k', '{}')
    expect(loadFromStorage('k', [] as number[])).toEqual([])
  })

  it('does not apply the array check when the fallback itself is not an array', () => {
    localStorage.setItem('k', '"some-id"')
    expect(loadFromStorage<string | undefined>('k', undefined)).toBe('some-id')
  })
})
