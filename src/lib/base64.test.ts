import { describe, expect, it } from 'vitest'
import { base64DecodeUtf8, base64EncodeUtf8 } from './base64'

describe('base64EncodeUtf8 / base64DecodeUtf8', () => {
  it('round-trips plain ASCII', () => {
    expect(base64DecodeUtf8(base64EncodeUtf8('user:pass'))).toBe('user:pass')
  })

  it('round-trips non-Latin1 Unicode without throwing', () => {
    const text = 'usér:pässwörd 日本語'
    expect(base64DecodeUtf8(base64EncodeUtf8(text))).toBe(text)
  })

  it('round-trips an empty string', () => {
    expect(base64DecodeUtf8(base64EncodeUtf8(''))).toBe('')
  })

  it('returns undefined for input that is not valid base64', () => {
    expect(base64DecodeUtf8('not-base64!!!')).toBeUndefined()
  })
})
