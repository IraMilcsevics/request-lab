export type JsonPathResult = { ok: true; value: unknown } | { ok: false; error: string }

const EXAMPLE_HINT = 'Enter a JSON path, e.g. "data.id" or "items[0].name".'

function parsePath(path: string): string[] | { error: string } {
  const trimmed = path.trim()
  if (trimmed === '') return { error: EXAMPLE_HINT }

  const segments: string[] = []
  let current = ''
  let i = 0

  const pushCurrent = () => {
    if (current !== '') segments.push(current)
    current = ''
  }

  while (i < trimmed.length) {
    const char = trimmed[i]
    if (char === '.') {
      pushCurrent()
      i++
    } else if (char === '[') {
      pushCurrent()
      const close = trimmed.indexOf(']', i)
      if (close === -1) return { error: 'Missing a closing "]" in the path.' }
      const index = trimmed.slice(i + 1, close).trim()
      if (!/^\d+$/.test(index)) return { error: `Array index must be a number, got "${index}".` }
      segments.push(index)
      i = close + 1
    } else {
      current += char
      i++
    }
  }
  pushCurrent()

  if (segments.length === 0) return { error: EXAMPLE_HINT }
  return segments
}

/** Resolves a dot/bracket JSON path (e.g. "data.items[0].id") against a value parsed from a response body. */
export function extractJsonPath(root: unknown, path: string): JsonPathResult {
  const segments = parsePath(path)
  if (!Array.isArray(segments)) return { ok: false, error: segments.error }

  let current: unknown = root
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return { ok: false, error: `Can't read "${segment}" from a ${current === null ? 'null' : typeof current} value.` }
    }
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (index < 0 || index >= current.length) {
        return { ok: false, error: `No item at index ${segment} (the array has ${current.length}).` }
      }
      current = current[index]
    } else {
      const record = current as Record<string, unknown>
      if (!Object.prototype.hasOwnProperty.call(record, segment)) {
        return { ok: false, error: `No key "${segment}" in the response.` }
      }
      current = record[segment]
    }
  }

  if (current === undefined) return { ok: false, error: 'That path resolved to undefined.' }
  return { ok: true, value: current }
}
