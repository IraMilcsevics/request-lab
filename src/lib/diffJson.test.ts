import { describe, expect, it } from 'vitest'
import { countDifferences, diffJson } from './diffJson'

describe('diffJson — primitives', () => {
  it('marks equal primitives as unchanged', () => {
    expect(diffJson(1, 1)).toEqual({ kind: 'leaf', status: 'unchanged', before: 1, after: 1 })
    expect(diffJson('a', 'a')).toEqual({ kind: 'leaf', status: 'unchanged', before: 'a', after: 'a' })
    expect(diffJson(true, true)).toEqual({ kind: 'leaf', status: 'unchanged', before: true, after: true })
    expect(diffJson(null, null)).toEqual({ kind: 'leaf', status: 'unchanged', before: null, after: null })
  })

  it('marks different primitives as changed, keeping both values', () => {
    expect(diffJson(1, 2)).toEqual({ kind: 'leaf', status: 'changed', before: 1, after: 2 })
    expect(diffJson('a', 'b')).toEqual({ kind: 'leaf', status: 'changed', before: 'a', after: 'b' })
  })

  it('treats a type change (e.g. number to string) as changed', () => {
    expect(diffJson(1, '1')).toEqual({ kind: 'leaf', status: 'changed', before: 1, after: '1' })
  })
})

describe('diffJson — objects', () => {
  it('marks an object unchanged when every key matches', () => {
    const node = diffJson({ a: 1, b: 'x' }, { a: 1, b: 'x' })
    expect(node.status).toBe('unchanged')
  })

  it('marks a key added only in "after"', () => {
    const node = diffJson({ a: 1 }, { a: 1, b: 2 })
    expect(node.status).toBe('changed')
    if (node.kind !== 'object') throw new Error('expected object')
    const bEntry = node.entries.find((e) => e.key === 'b')!
    expect(bEntry.node).toEqual({ kind: 'leaf', status: 'added', before: undefined, after: 2 })
  })

  it('marks a key removed only from "before"', () => {
    const node = diffJson({ a: 1, b: 2 }, { a: 1 })
    if (node.kind !== 'object') throw new Error('expected object')
    const bEntry = node.entries.find((e) => e.key === 'b')!
    expect(bEntry.node).toEqual({ kind: 'leaf', status: 'removed', before: 2, after: undefined })
  })

  it('marks a changed value', () => {
    const node = diffJson({ a: 1 }, { a: 2 })
    if (node.kind !== 'object') throw new Error('expected object')
    expect(node.entries[0].node).toEqual({ kind: 'leaf', status: 'changed', before: 1, after: 2 })
  })

  it('sorts keys so entries are stable regardless of input order', () => {
    const node = diffJson({ b: 1, a: 2 }, { a: 2, b: 1 })
    if (node.kind !== 'object') throw new Error('expected object')
    expect(node.entries.map((e) => e.key)).toEqual(['a', 'b'])
  })

  it('recurses into nested objects', () => {
    const node = diffJson({ user: { name: 'Ada' } }, { user: { name: 'Grace' } })
    if (node.kind !== 'object') throw new Error('expected object')
    const userEntry = node.entries[0].node
    expect(userEntry.status).toBe('changed')
    if (userEntry.kind !== 'object') throw new Error('expected nested object')
    expect(userEntry.entries[0].node).toEqual({ kind: 'leaf', status: 'changed', before: 'Ada', after: 'Grace' })
  })

  it('reports a whole added/removed nested object as a single leaf, not a branch', () => {
    const added = diffJson({}, { user: { name: 'Ada' } })
    if (added.kind !== 'object') throw new Error('expected object')
    expect(added.entries[0].node).toEqual({
      kind: 'leaf',
      status: 'added',
      before: undefined,
      after: { name: 'Ada' },
    })
  })
})

describe('diffJson — arrays', () => {
  it('marks an array unchanged when all elements match', () => {
    expect(diffJson([1, 2, 3], [1, 2, 3]).status).toBe('unchanged')
  })

  it('diffs by index, treating a shorter array as missing trailing elements', () => {
    const node = diffJson([1, 2, 3], [1, 2])
    if (node.kind !== 'array') throw new Error('expected array')
    expect(node.entries[2].node).toEqual({ kind: 'leaf', status: 'removed', before: 3, after: undefined })
  })

  it('treats a longer "after" array as added trailing elements', () => {
    const node = diffJson([1], [1, 2])
    if (node.kind !== 'array') throw new Error('expected array')
    expect(node.entries[1].node).toEqual({ kind: 'leaf', status: 'added', before: undefined, after: 2 })
  })
})

describe('countDifferences', () => {
  it('is 0 for two identical values', () => {
    expect(countDifferences(diffJson({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] }))).toBe(0)
  })

  it('counts every differing leaf across the whole tree', () => {
    const node = diffJson({ a: 1, b: 2, c: { d: 3 } }, { a: 1, b: 20, c: { d: 30 }, e: 4 })
    // b changed, c.d changed, e added = 3
    expect(countDifferences(node)).toBe(3)
  })
})
