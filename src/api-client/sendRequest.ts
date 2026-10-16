import { MAX_TIMEOUT_MS } from '../lib/timeout'
import { buildRequest } from './buildRequest'
import type { ApiResult, RequestDraft } from './types'

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

/**
 * Builds and sends a request, always resolving (never throwing) with a
 * tagged `ApiResult`. Network errors, timeouts and user-initiated aborts are
 * all reported as distinct error kinds so the UI can tell them apart.
 *
 * An invalid *response* body (not JSON) is NOT an error here — `rawBody` is
 * always captured and `json` is simply left out, so the UI can still show
 * the raw text. Only an invalid *request* body (caught in `buildRequest`)
 * fails outright, since that's a mistake the user can fix before sending.
 */
export async function sendRequest(draft: RequestDraft, externalSignal?: AbortSignal): Promise<ApiResult> {
  const built = buildRequest(draft)
  if (!built.ok) return { ok: false, error: built.error }

  // draft.timeoutMs normally only ever comes from the UI's own clamped
  // input (which already enforces MIN_TIMEOUT_MS/MAX_TIMEOUT_MS), but a
  // draft can also arrive from an import/saved-request path. Only guard
  // against the genuinely degenerate cases here (zero, negative, NaN) —
  // where setTimeout would fire immediately or never — without re-imposing
  // the UI's full MIN_TIMEOUT_MS floor on every caller.
  const timeoutMs = Number.isFinite(draft.timeoutMs) && draft.timeoutMs > 0 ? draft.timeoutMs : MAX_TIMEOUT_MS

  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

  const signal = externalSignal
    ? AbortSignal.any([timeoutController.signal, externalSignal])
    : timeoutController.signal

  const startedAt = performance.now()
  try {
    const response = await fetch(built.built.url, { ...built.built.init, signal })
    const rawBody = await response.text()
    const durationMs = performance.now() - startedAt

    let json: unknown
    try {
      json = rawBody === '' ? undefined : JSON.parse(rawBody)
    } catch {
      json = undefined
    }

    return {
      ok: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: headersToRecord(response.headers),
        rawBody,
        json,
        durationMs,
      },
    }
  } catch (cause) {
    const durationMs = performance.now() - startedAt
    if (externalSignal?.aborted) {
      return { ok: false, error: { kind: 'aborted', message: 'Request was cancelled.', durationMs } }
    }
    if (timeoutController.signal.aborted) {
      return {
        ok: false,
        error: { kind: 'timeout', message: `Request timed out after ${timeoutMs}ms.`, durationMs },
      }
    }
    const message = cause instanceof Error ? cause.message : 'Network request failed.'
    return { ok: false, error: { kind: 'network', message, durationMs } }
  } finally {
    clearTimeout(timeoutId)
  }
}
