import { describe, expect, it } from 'vitest'
import { displayUrl } from './displayUrl'

describe('displayUrl', () => {
  it('strips an http scheme', () => {
    expect(displayUrl('http://api.example.com/things')).toBe('api.example.com/things')
  })

  it('strips an https scheme', () => {
    expect(displayUrl('https://api.example.com/things')).toBe('api.example.com/things')
  })

  it('leaves a schemeless or templated URL untouched', () => {
    expect(displayUrl('api.example.com/things')).toBe('api.example.com/things')
    expect(displayUrl('{{baseUrl}}/things')).toBe('{{baseUrl}}/things')
  })
})
