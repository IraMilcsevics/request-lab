import type { ApiResult } from './types'

/** Whether a result succeeded with a response whose body parsed as JSON — the shared gate for "can this response be diffed, extracted from, or shown as a tree". */
export function hasJsonBody(result: ApiResult | undefined): result is Extract<ApiResult, { ok: true }> {
  return result !== undefined && result.ok && result.response.json !== undefined
}
