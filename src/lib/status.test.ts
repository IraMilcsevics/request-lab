import { describe, expect, it } from 'vitest'
import { describeResult, errorHint, errorTitle, toneForErrorKind, toneForMethod, toneForStatus } from './status'

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

describe('errorTitle', () => {
  it('gives every error kind a short, human title', () => {
    expect(errorTitle('network')).toBe('Network error')
    expect(errorTitle('timeout')).toBe('Request timed out')
    expect(errorTitle('aborted')).toBe('Request cancelled')
    expect(errorTitle('invalid-request')).toBe('Invalid request')
    expect(errorTitle('invalid-json')).toBe('Invalid JSON body')
  })
})

describe('errorHint', () => {
  it('gives a network error a CORS-aware hint, since the browser hides the real reason', () => {
    const hint = errorHint('network')
    expect(hint).toBeDefined()
    expect(hint).toMatch(/CORS/)
  })

  it('gives no hint to error kinds whose message already says what happened', () => {
    expect(errorHint('timeout')).toBeUndefined()
    expect(errorHint('aborted')).toBeUndefined()
    expect(errorHint('invalid-request')).toBeUndefined()
    expect(errorHint('invalid-json')).toBeUndefined()
  })
})

describe('describeResult', () => {
  it('summarizes a successful response as "<status> <statusText>"', () => {
    const result = {
      ok: true as const,
      response: { status: 200, statusText: 'OK', headers: {}, rawBody: '', durationMs: 10 },
    }
    expect(describeResult(result)).toBe('200 OK')
  })

  it('summarizes a failed result by its error title', () => {
    const result = { ok: false as const, error: { kind: 'timeout' as const, message: 'x' } }
    expect(describeResult(result)).toBe('Request timed out')
  })
})
