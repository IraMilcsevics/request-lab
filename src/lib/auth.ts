import type { KeyValue } from '../api-client'
import { base64DecodeUtf8, base64EncodeUtf8 } from './base64'

export type AuthType = 'none' | 'bearer' | 'basic'

export interface AuthState {
  type: AuthType
  token?: string
  username?: string
  password?: string
}

const AUTH_HEADER_KEY = 'authorization'

/**
 * Reads the current Authorization header (if any) back into Auth-tab
 * state, purely for display — nothing here writes anything. A header this
 * can't confidently parse as Bearer/Basic (or none at all) reads as 'none',
 * so the tab doesn't claim to manage a scheme it doesn't understand. A
 * *disabled* Authorization header also reads as 'none' — the request isn't
 * actually sending it, so the Auth tab shouldn't claim it's active.
 */
export function authStateFromHeaders(headers: KeyValue[]): AuthState {
  const header = headers.find((h) => h.enabled && h.key.trim().toLowerCase() === AUTH_HEADER_KEY)
  if (!header) return { type: 'none' }

  if (header.value.startsWith('Bearer ')) {
    return { type: 'bearer', token: header.value.slice('Bearer '.length) }
  }

  if (header.value.startsWith('Basic ')) {
    const decoded = base64DecodeUtf8(header.value.slice('Basic '.length))
    if (decoded !== undefined) {
      const colon = decoded.indexOf(':')
      return colon === -1
        ? { type: 'basic', username: decoded, password: '' }
        : { type: 'basic', username: decoded.slice(0, colon), password: decoded.slice(colon + 1) }
    }
  }

  return { type: 'none' }
}

/**
 * Upserts or removes the Authorization header to match an Auth-tab
 * selection, leaving every other header untouched.
 */
export function applyAuthToHeaders(headers: KeyValue[], auth: AuthState): KeyValue[] {
  const withoutAuth = headers.filter((h) => h.key.trim().toLowerCase() !== AUTH_HEADER_KEY)

  if (auth.type === 'none') return withoutAuth

  const value =
    auth.type === 'bearer'
      ? `Bearer ${auth.token ?? ''}`
      : `Basic ${base64EncodeUtf8(`${auth.username ?? ''}:${auth.password ?? ''}`)}`

  return [...withoutAuth, { key: 'Authorization', value, enabled: true }]
}
