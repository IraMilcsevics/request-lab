export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface KeyValue {
  key: string
  value: string
  /** Disabled rows are kept (e.g. for UI undo) but excluded when building the request. */
  enabled: boolean
}

/** Everything the UI knows about a request before it is sent. */
export interface RequestDraft {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  /** Raw JSON text as typed by the user; undefined/empty means "no body". */
  body?: string
  /** Milliseconds before the request is aborted as a timeout. */
  timeoutMs: number
}

/** The fully resolved thing that will actually be sent — useful for "copy as cURL" etc. */
export interface BuiltRequest {
  url: string
  init: RequestInit
}

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  /** Raw response text, always captured so it can be shown even when it isn't JSON. */
  rawBody: string
  /** Parsed JSON body, present only when rawBody was valid JSON. */
  json?: unknown
  /** Time from sending the request to receiving the full response, in milliseconds. */
  durationMs: number
}

export type ApiErrorKind =
  | 'invalid-request'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'invalid-json'

export interface ApiError {
  kind: ApiErrorKind
  message: string
  /** How long the request ran before failing, when known. */
  durationMs?: number
}

export type ApiResult =
  | { ok: true; response: ApiResponse }
  | { ok: false; error: ApiError }
