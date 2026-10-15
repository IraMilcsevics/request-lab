import { describe, expect, it } from 'vitest'
import { matchesUrl } from './filter'

describe('matchesUrl', () => {
  it('matches any url when the query is blank', () => {
    expect(matchesUrl('https://api.example.com/users', '   ')).toBe(true)
  })

  it('matches case-insensitively on a substring', () => {
    expect(matchesUrl('https://api.example.com/Users/482', 'users')).toBe(true)
  })

  it('rejects a url that does not contain the query', () => {
    expect(matchesUrl('https://api.example.com/sessions', 'users')).toBe(false)
  })
})
