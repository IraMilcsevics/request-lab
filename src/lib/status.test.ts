import { describe, expect, it } from 'vitest'
import { toneForErrorKind, toneForMethod, toneForStatus } from './status'

describe('toneForStatus', () => {
  it('maps status code families to tones', () => {
    expect(toneForStatus(200)).toBe('success')
    expect(toneForStatus(201)).toBe('success')
    expect(toneForStatus(404)).toBe('warn')
    expect(toneForStatus(500)).toBe('danger')
  })
})

describe('toneForErrorKind', () => {
  it('treats a user-cancelled request as neutral, not a failure', () => {
    expect(toneForErrorKind('aborted')).toBe('neutral')
  })

  it('treats every other error kind as a failure', () => {
    expect(toneForErrorKind('network')).toBe('danger')
    expect(toneForErrorKind('timeout')).toBe('danger')
    expect(toneForErrorKind('invalid-json')).toBe('danger')
    expect(toneForErrorKind('invalid-request')).toBe('danger')
  })
})

describe('toneForMethod', () => {
  it('maps each method to its badge tone', () => {
    expect(toneForMethod('GET')).toBe('success')
    expect(toneForMethod('POST')).toBe('accent')
    expect(toneForMethod('PUT')).toBe('warn')
    expect(toneForMethod('DELETE')).toBe('danger')
  })
})
