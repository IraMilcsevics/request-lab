/**
 * Thin, defensive wrapper around localStorage: a private window, cleared
 * site data, or a blocked store should degrade to "nothing saved" rather
 * than crash the app.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    // A minimal shape check, not a full schema validation: when the caller
    // expects an array (history, saved requests, collections, environments
    // — every array-shaped key this app stores), a value that parsed fine
    // as JSON but isn't an array is almost certainly leftover/incompatible
    // data from an older schema, not what the caller actually expects.
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — the in-memory state still works for
    // this session, it just won't persist across reloads.
  }
}
