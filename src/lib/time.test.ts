import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './time'

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-15T12:00:00Z').getTime()

  it('says "just now" for anything under a minute old', () => {
    expect(formatRelativeTime(now - 10_000, now)).toBe('just now')
  })

  it('reports minutes, pluralized', () => {
    expect(formatRelativeTime(now - 60_000, now)).toBe('1 min ago')
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 mins ago')
  })

  it('reports hours once past 60 minutes', () => {
    expect(formatRelativeTime(now - 2 * 60 * 60_000, now)).toBe('2 hrs ago')
  })

  it('reports days once past 24 hours', () => {
    expect(formatRelativeTime(now - 25 * 60 * 60_000, now)).toBe('1 day ago')
  })

  it('never shows a negative duration for a future timestamp', () => {
    expect(formatRelativeTime(now + 10_000, now)).toBe('just now')
  })
})
