import type { ApiError, BuiltRequest, KeyValue, RequestDraft } from './types'

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])

function toEnabledEntries(items: KeyValue[]): Array<[string, string]> {
  return items
    .filter((item) => item.enabled && item.key.trim() !== '')
    .map((item) => [item.key, item.value] as [string, string])
}

function appendQueryParams(rawUrl: string, params: KeyValue[]): string {
  const entries = toEnabledEntries(params)
  if (entries.length === 0) return rawUrl

  // URL may be relative/partial while the user is still typing; fall back to
  // plain string concatenation rather than throwing on an invalid base.
  try {
    const url = new URL(rawUrl)
    for (const [key, value] of entries) url.searchParams.append(key, value)
    return url.toString()
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?'
    const query = entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return `${rawUrl}${separator}${query}`
  }
}

/**
 * Turns a `RequestDraft` from the UI into the exact `url` + `RequestInit`
 * that will be sent, or an error if the draft can't be turned into a valid
 * request at all (bad URL, malformed JSON body). Pure and network-free, so
 * it's easy to unit test and reuse for things like "copy as cURL".
 */
export function buildRequest(draft: RequestDraft): { ok: true; built: BuiltRequest } | { ok: false; error: ApiError } {
  const trimmedUrl = draft.url.trim()
  if (trimmedUrl === '') {
    return { ok: false, error: { kind: 'invalid-request', message: 'URL is required.' } }
  }

  const url = appendQueryParams(trimmedUrl, draft.params)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { ok: false, error: { kind: 'invalid-request', message: `"${trimmedUrl}" is not a valid URL.` } }
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { ok: false, error: { kind: 'invalid-request', message: 'Only http(s) URLs are supported.' } }
  }

  const headers = new Headers()
  for (const [key, value] of toEnabledEntries(draft.headers)) headers.set(key, value)

  const init: RequestInit = { method: draft.method, headers }

  const hasBody = BODY_METHODS.has(draft.method) && (draft.body ?? '').trim() !== ''
  if (hasBody) {
    const bodyText = (draft.body ?? '').trim()
    try {
      JSON.parse(bodyText)
    } catch {
      return { ok: false, error: { kind: 'invalid-json', message: 'Request body is not valid JSON.' } }
    }
    init.body = bodyText
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  }

  return { ok: true, built: { url: parsedUrl.toString(), init } }
}
