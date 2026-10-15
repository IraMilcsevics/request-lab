import { describe, expect, it } from 'vitest'
import { parseCollectionsImport, serializeCollections } from './collections'
import type { Collection, SavedRequest } from '../types/ui'

const draft = {
  method: 'GET' as const,
  url: 'https://api.example.com/users/1',
  params: [],
  headers: [],
  body: '',
  timeoutMs: 8000,
}

describe('serializeCollections / parseCollectionsImport round-trip', () => {
  it('parses back exactly what was serialized', () => {
    const collections: Collection[] = [{ id: 'c1', name: 'Auth' }]
    const saved: SavedRequest[] = [{ id: 's1', name: 'Login', draft, collectionId: 'c1' }]

    const json = serializeCollections(collections, saved)
    const result = parseCollectionsImport(json)

    expect(result).toEqual({ ok: true, collections, saved })
  })

  it('round-trips a request with no collection', () => {
    const saved: SavedRequest[] = [{ id: 's1', name: 'Get user', draft }]
    const json = serializeCollections([], saved)
    const result = parseCollectionsImport(json)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.saved[0].collectionId).toBeUndefined()
  })
})

describe('parseCollectionsImport — rejecting bad input', () => {
  it('rejects text that is not valid JSON', () => {
    const result = parseCollectionsImport('{not json')
    expect(result).toEqual({ ok: false, error: 'That file is not valid JSON.' })
  })

  it('rejects valid JSON that is not an object', () => {
    expect(parseCollectionsImport('[1,2,3]').ok).toBe(false)
    expect(parseCollectionsImport('"hello"').ok).toBe(false)
    expect(parseCollectionsImport('null').ok).toBe(false)
  })

  it('rejects a missing or malformed "collections" list', () => {
    expect(parseCollectionsImport(JSON.stringify({ saved: [] })).ok).toBe(false)
    expect(parseCollectionsImport(JSON.stringify({ collections: [{ id: 1 }], saved: [] })).ok).toBe(false)
  })

  it('rejects a missing or malformed "saved" list', () => {
    expect(parseCollectionsImport(JSON.stringify({ collections: [] })).ok).toBe(false)
    expect(parseCollectionsImport(JSON.stringify({ collections: [], saved: [{ name: 'x' }] })).ok).toBe(false)
  })

  it('accepts an empty, valid export', () => {
    const result = parseCollectionsImport(serializeCollections([], []))
    expect(result).toEqual({ ok: true, collections: [], saved: [] })
  })
})
