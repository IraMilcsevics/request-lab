import type { CSSProperties } from 'react'
import type { ApiErrorKind, ApiResult, HttpMethod } from '../api-client'

export type Tone = 'success' | 'warn' | 'danger' | 'accent' | 'neutral'

/** Maps an HTTP status code to the tone used for its badge/dot color. */
export function toneForStatus(status: number): Tone {
  if (status < 300) return 'success'
  if (status < 500) return 'warn'
  return 'danger'
}

/** Maps an api-client error kind to a tone — a user-cancelled request reads as neutral, not a failure. */
export function toneForErrorKind(kind: ApiErrorKind): Tone {
  return kind === 'aborted' ? 'neutral' : 'danger'
}

const METHOD_TONE: Record<HttpMethod, Tone> = {
  GET: 'success',
  POST: 'accent',
  PUT: 'warn',
  PATCH: 'warn',
  DELETE: 'danger',
}

export function toneForMethod(method: HttpMethod): Tone {
  return METHOD_TONE[method]
}

export interface ToneColors {
  bg: string
  fg: string
  border: string
}

const TONE_COLORS: Record<Tone, ToneColors> = {
  success: { bg: 'var(--success-bg)', fg: 'var(--success-fg)', border: 'var(--success-border)' },
  warn: { bg: 'var(--warn-bg)', fg: 'var(--warn-fg)', border: 'var(--warn-border)' },
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger-fg)', border: 'var(--danger-border)' },
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)', border: 'var(--accent-soft-border)' },
  neutral: { bg: 'var(--neutral-bg)', fg: 'var(--neutral-fg)', border: 'var(--neutral-border)' },
}

export function toneColors(tone: Tone): ToneColors {
  return TONE_COLORS[tone]
}

/** A tone's colors as an inline `style` object for a badge — background + text + border in one place, so a badge never ends up missing one of the three. */
export function toneStyle(tone: Tone): CSSProperties {
  const colors = toneColors(tone)
  return { background: colors.bg, color: colors.fg, borderColor: colors.border }
}

const ERROR_TITLES: Record<ApiErrorKind, string> = {
  'invalid-request': 'Invalid request',
  'invalid-json': 'Invalid JSON body',
  network: 'Network error',
  timeout: 'Request timed out',
  aborted: 'Request cancelled',
}

export function errorTitle(kind: ApiErrorKind): string {
  return ERROR_TITLES[kind]
}

/** A short, human-readable summary of a result — "200 OK" or an error's title — for tooltips and screen readers. */
export function describeResult(result: ApiResult): string {
  return result.ok ? `${result.response.status} ${result.response.statusText}`.trim() : errorTitle(result.error.kind)
}

/**
 * Extra context for an error whose message alone could mislead. A browser's
 * `fetch` deliberately gives the same generic failure for a CORS rejection,
 * an unreachable host, or a DNS/network problem — it never says which, so
 * neither do we. Only `network` gets a hint; every other kind's message is
 * already specific enough on its own.
 */
export function errorHint(kind: ApiErrorKind): string | undefined {
  if (kind !== 'network') return undefined
  return "Browsers don't say why a cross-origin request failed — it's usually a CORS policy blocking the response (the server needs to send Access-Control-Allow-Origin), but it can also mean the server is unreachable or there's a DNS/network problem. Check the browser console or the server's CORS headers for more."
}
