import { describe, expect, it } from 'vitest'
import { formatBytes, utf8ByteLength } from './bytes'

describe('formatBytes', () => {
  it('shows bytes under 1024', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('shows one decimal of KB at or above 1024', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})

describe('utf8ByteLength', () => {
  it('matches .length for plain ASCII', () => {
    expect(utf8ByteLength('hello')).toBe(5)
  })

  it('counts multi-byte characters correctly, unlike .length', () => {
    expect(utf8ByteLength('é')).toBe(2)
    expect('é'.length).toBe(1)
  })
})
