import { describe, expect, it } from 'vitest'
import { clampTimeoutMs, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS } from './timeout'

describe('clampTimeoutMs', () => {
  it('keeps an in-range value as-is (rounded)', () => {
    expect(clampTimeoutMs(5000, 8000)).toBe(5000)
    expect(clampTimeoutMs(5000.6, 8000)).toBe(5001)
  })

  it('clamps below the minimum', () => {
    expect(clampTimeoutMs(0, 8000)).toBe(MIN_TIMEOUT_MS)
  })

  it('clamps above the maximum', () => {
    expect(clampTimeoutMs(999_999, 8000)).toBe(MAX_TIMEOUT_MS)
  })

  it('falls back to the previous value for non-numeric input', () => {
    expect(clampTimeoutMs(Number.NaN, 8000)).toBe(8000)
  })
})
