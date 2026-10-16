import { describe, expect, it } from 'vitest'
import { filterEnabledKeyValues } from './filterEnabledKeyValues'

describe('filterEnabledKeyValues', () => {
  it('keeps enabled rows with a non-blank key', () => {
    const result = filterEnabledKeyValues([
      { key: 'a', value: '1', enabled: true },
      { key: 'b', value: '2', enabled: false },
      { key: '', value: '3', enabled: true },
      { key: '   ', value: '4', enabled: true },
    ])
    expect(result).toEqual([{ key: 'a', value: '1', enabled: true }])
  })

  it('returns an empty array for an empty input', () => {
    expect(filterEnabledKeyValues([])).toEqual([])
  })
})
