import { describe, expect, it } from 'vitest'
import { applyAuthToHeaders, authStateFromHeaders } from './auth'
import type { KeyValue } from '../api-client'

describe('authStateFromHeaders', () => {
  it('reads "none" when there is no Authorization header', () => {
    expect(authStateFromHeaders([])).toEqual({ type: 'none' })
    expect(authStateFromHeaders([{ key: 'Accept', value: 'application/json', enabled: true }])).toEqual({
      type: 'none',
    })
  })

  it('reads a Bearer token', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: 'Bearer abc123', enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'bearer', token: 'abc123' })
  })

  it('reads Basic credentials', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: `Basic ${btoa('ada:secret')}`, enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'basic', username: 'ada', password: 'secret' })
  })

  it('finds the header case-insensitively', () => {
    const headers: KeyValue[] = [{ key: 'authorization', value: 'Bearer xyz', enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'bearer', token: 'xyz' })
  })

  it('reads "none" for a scheme it does not recognize, without touching the header', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: 'Digest something=else', enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'none' })
  })

  it('reads "none" for an undecodable Basic value', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: 'Basic not-valid-base64!!!', enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'none' })
  })

  it('splits only on the first colon, so a password containing one survives', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: `Basic ${btoa('ada:se:cret')}`, enabled: true }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'basic', username: 'ada', password: 'se:cret' })
  })

  it('reads "none" for a disabled Authorization header, since the request does not actually send it', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: 'Bearer abc123', enabled: false }]
    expect(authStateFromHeaders(headers)).toEqual({ type: 'none' })
  })
})

describe('applyAuthToHeaders', () => {
  it('adds a Bearer header, leaving other headers alone', () => {
    const headers: KeyValue[] = [{ key: 'Accept', value: 'application/json', enabled: true }]
    const result = applyAuthToHeaders(headers, { type: 'bearer', token: 'abc123' })
    expect(result).toEqual([
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer abc123', enabled: true },
    ])
  })

  it('adds a Basic header from username/password', () => {
    const result = applyAuthToHeaders([], { type: 'basic', username: 'ada', password: 'secret' })
    expect(result).toEqual([{ key: 'Authorization', value: `Basic ${btoa('ada:secret')}`, enabled: true }])
  })

  it('removes any existing Authorization header for "none"', () => {
    const headers: KeyValue[] = [
      { key: 'Authorization', value: 'Bearer old', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
    ]
    const result = applyAuthToHeaders(headers, { type: 'none' })
    expect(result).toEqual([{ key: 'Accept', value: 'application/json', enabled: true }])
  })

  it('replaces an existing Authorization header rather than duplicating it', () => {
    const headers: KeyValue[] = [{ key: 'Authorization', value: 'Bearer old', enabled: true }]
    const result = applyAuthToHeaders(headers, { type: 'bearer', token: 'new' })
    expect(result).toEqual([{ key: 'Authorization', value: 'Bearer new', enabled: true }])
  })

  it('handles unicode credentials safely (not just Latin1)', () => {
    const result = applyAuthToHeaders([], { type: 'basic', username: 'ádá', password: 'sëcret' })
    expect(authStateFromHeaders(result)).toEqual({ type: 'basic', username: 'ádá', password: 'sëcret' })
  })
})

describe('authStateFromHeaders / applyAuthToHeaders round-trip', () => {
  it('round-trips bearer', () => {
    const headers = applyAuthToHeaders([], { type: 'bearer', token: 'abc' })
    expect(authStateFromHeaders(headers)).toEqual({ type: 'bearer', token: 'abc' })
  })

  it('round-trips basic', () => {
    const headers = applyAuthToHeaders([], { type: 'basic', username: 'ada', password: 'secret' })
    expect(authStateFromHeaders(headers)).toEqual({ type: 'basic', username: 'ada', password: 'secret' })
  })
})
