export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffLeaf {
  kind: 'leaf'
  status: DiffStatus
  before: unknown
  after: unknown
}

export interface DiffEntry {
  key: string
  node: DiffNode
}

export interface DiffBranch {
  kind: 'object' | 'array'
  status: DiffStatus
  entries: DiffEntry[]
}

export type DiffNode = DiffLeaf | DiffBranch

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * A structural diff between two JSON-serializable values — not a text diff
 * of their stringified forms. Walks matching objects key by key and arrays
 * index by index (a positional comparison, not an LCS/Myers alignment —
 * good enough for comparing two API responses shaped the same way, which
 * is the actual use case); anything else (primitives, or a value present
 * on only one side) is a leaf.
 *
 * A branch's own status is 'changed' whenever any descendant differs, so a
 * collapsed node still shows it has something different inside.
 */
export function diffJson(before: unknown, after: unknown): DiffNode {
  if (before === undefined && after === undefined) {
    return { kind: 'leaf', status: 'unchanged', before, after }
  }
  if (before === undefined) return { kind: 'leaf', status: 'added', before, after }
  if (after === undefined) return { kind: 'leaf', status: 'removed', before, after }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
    const entries = keys.map((key) => ({ key, node: diffJson(before[key], after[key]) }))
    const status = entries.some((e) => e.node.status !== 'unchanged') ? 'changed' : 'unchanged'
    return { kind: 'object', status, entries }
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length)
    const entries = Array.from({ length }, (_, i) => ({ key: String(i), node: diffJson(before[i], after[i]) }))
    const status = entries.some((e) => e.node.status !== 'unchanged') ? 'changed' : 'unchanged'
    return { kind: 'array', status, entries }
  }

  const equal = JSON.stringify(before) === JSON.stringify(after)
  return { kind: 'leaf', status: equal ? 'unchanged' : 'changed', before, after }
}

// A DiffNode tree, once built, is never mutated — DiffViewer calls
// countDifferences on the same branch objects over and over (once per
// render, at every nesting level, since a parent's count recurses through
// its children's subtrees too). Caching by node identity turns what would
// be repeated O(subtree size) walks into one walk per node, ever.
const countCache = new WeakMap<DiffNode, number>()

/** Counts how many leaves differ (added + removed + changed), for a quick "N differences" summary. */
export function countDifferences(node: DiffNode): number {
  const cached = countCache.get(node)
  if (cached !== undefined) return cached

  const count =
    node.kind === 'leaf'
      ? node.status === 'unchanged'
        ? 0
        : 1
      : node.entries.reduce((sum, e) => sum + countDifferences(e.node), 0)

  countCache.set(node, count)
  return count
}
