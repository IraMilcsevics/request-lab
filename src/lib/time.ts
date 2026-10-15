const UNITS: Array<[name: string, ms: number]> = [
  ['yr', 365 * 24 * 60 * 60 * 1000],
  ['mo', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hr', 60 * 60 * 1000],
  ['min', 60 * 1000],
]

/** "2 min ago", "just now" — relative to `now` (defaults to the real clock; pass a fixed value in tests). */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  if (diff < 60_000) return 'just now'

  for (const [name, unitMs] of UNITS) {
    const count = Math.floor(diff / unitMs)
    if (count >= 1) return `${count} ${name}${count > 1 ? 's' : ''} ago`
  }
  return 'just now'
}
