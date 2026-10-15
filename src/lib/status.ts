import type { ApiErrorKind, HttpMethod } from '../api-client'

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
