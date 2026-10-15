export const MIN_TIMEOUT_MS = 100
export const MAX_TIMEOUT_MS = 60_000

/** Keeps a user-typed timeout within a sane range, falling back to the previous value for non-numeric input. */
export function clampTimeoutMs(value: number, previous: number): number {
  if (!Number.isFinite(value)) return previous
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(value)))
}
