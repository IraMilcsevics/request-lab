import type { KeyValue } from '../api-client'

export type AuthType = 'none' | 'bearer' | 'basic'

export interface AuthState {
  type: AuthType
  token?: string
  username?: string
  password?: string
}

const AUTH_HEADER_KEY = 'authorization'

function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64DecodeUtf8(encoded: string): string | undefined {
  try {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return undefined
  }
}

/**
 * Reads the current Authorization header (if any) back into Auth-tab
 * state, purely for display — nothing here writes anything. A header this
 * can't confidently parse as Bearer/Basic (or none at all) reads as 'none',
 * so the tab doesn't claim to manage a scheme it doesn't understand.
 */
export function authStateFromHeaders(headers: KeyValue[]): AuthState {
  const header = headers.find((h) => h.key.trim().toLowerCase() === AUTH_HEADER_KEY)
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
