/**
 * Thin, defensive wrapper around localStorage: a private window, cleared
 * site data, or a blocked store should degrade to "nothing saved" rather
 * than crash the app.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
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
