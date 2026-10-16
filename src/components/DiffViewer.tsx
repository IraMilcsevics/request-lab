import { useMemo, useState } from 'react'
import { countDifferences, diffJson } from '../lib/diffJson'
import type { DiffNode } from '../lib/diffJson'
import { ChevronRightIcon } from './icons'
import { JsonTree } from './JsonTree'
import jsonStyles from './JsonTree.module.css'
import styles from './DiffViewer.module.css'

function PrimitiveValue({ value }: { value: unknown }) {
  if (typeof value === 'string') return <span className={jsonStyles.string}>{JSON.stringify(value)}</span>
  if (typeof value === 'number') return <span className={jsonStyles.number}>{JSON.stringify(value)}</span>
  if (typeof value === 'boolean') return <span className={jsonStyles.boolean}>{String(value)}</span>
  if (value === null) return <span className={jsonStyles.null}>null</span>
  // A changed value where the types themselves differ (e.g. object -> array) —
  // rare, and not worth a nested diff; show it compactly as JSON text.
  return <span className={jsonStyles.string}>{JSON.stringify(value)}</span>
}

function KeyLabel({ name }: { name: string | undefined }) {
  if (name === undefined) return null
  return (
    <>
      <span className={jsonStyles.key}>"{name}"</span>
      <span className={jsonStyles.punctuation}>: </span>
    </>
  )
}

interface DiffNodeViewProps {
  name: string | undefined
  node: DiffNode
  depth: number
  isLast: boolean
}

function DiffNodeView({ name, node, depth, isLast }: DiffNodeViewProps) {
  const [collapsed, setCollapsed] = useState(false)
  const indent = { paddingLeft: depth * 14 }
  const comma = !isLast && <span className={jsonStyles.punctuation}>,</span>

  if (node.kind === 'leaf') {
    if (node.status === 'unchanged') {
      return (
        <div className={`${styles.line} ${styles.unchanged}`} style={indent}>
          <span className={jsonStyles.gutter} />
          <KeyLabel name={name} />
          <PrimitiveValue value={node.after} />
          {comma}
        </div>
      )
    }

    const isStructured = (v: unknown) => v !== null && typeof v === 'object'

    if (node.status === 'added' || node.status === 'removed') {
      const value = node.status === 'added' ? node.after : node.before
      return (
        <>
          <div className={`${styles.line} ${styles[node.status]}`} style={indent}>
            <span className={styles.marker}>{node.status === 'added' ? '+' : '-'}</span>
            <KeyLabel name={name} />
            {!isStructured(value) && (
              <>
                <PrimitiveValue value={value} />
                {comma}
              </>
            )}
          </div>
          {isStructured(value) && (
            <div
              className={`${styles.nestedBlock} ${node.status === 'added' ? styles.nestedBlockAdded : styles.nestedBlockRemoved}`}
              style={{ marginLeft: depth * 14 }}
            >
              <JsonTree value={value} />
            </div>
          )}
        </>
      )
    }

    // status === 'changed': show the old value struck through, the new
    // value right below it — a classic two-line diff.
    return (
      <>
        <div className={`${styles.line} ${styles.changedBefore}`} style={indent}>
          <span className={styles.marker}>-</span>
          <KeyLabel name={name} />
          <PrimitiveValue value={node.before} />
          {comma}
        </div>
        <div className={`${styles.line} ${styles.changedAfter}`} style={indent}>
          <span className={styles.marker}>+</span>
          <KeyLabel name={name} />
          <PrimitiveValue value={node.after} />
          {comma}
        </div>
      </>
    )
  }

  // Branch (object/array), both sides present — recurse.
  const isArray = node.kind === 'array'
  const open = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'
  const isEmpty = node.entries.length === 0
  const diffCount = countDifferences(node)
  const directDiffCount = node.entries.filter((e) => e.node.status !== 'unchanged').length
  const summary = isEmpty
    ? ''
    : diffCount === 0
      ? `${node.entries.length} ${isArray ? 'items' : 'keys'}, unchanged`
      : `${directDiffCount} of ${node.entries.length} ${isArray ? 'items' : 'keys'} differ`

  return (
    <>
      <div className={`${styles.line} ${diffCount > 0 ? '' : styles.unchanged}`} style={indent}>
        {isEmpty ? (
          <span className={jsonStyles.gutter} />
        ) : (
          <button
            type="button"
            className={jsonStyles.toggle}
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${name ?? 'value'}`}
          >
            <ChevronRightIcon size={9} className={`${jsonStyles.chevron} ${collapsed ? '' : jsonStyles.chevronExpanded}`} />
          </button>
        )}
        <KeyLabel name={name} />
        <span className={jsonStyles.punctuation}>{open}</span>
        {collapsed && !isEmpty && <span className={jsonStyles.summary}> {summary} </span>}
        {(collapsed || isEmpty) && (
          <>
            <span className={jsonStyles.punctuation}>{close}</span>
            {comma}
          </>
        )}
      </div>

      {!collapsed &&
        !isEmpty &&
        node.entries.map((entry, i) => (
          <DiffNodeView
            key={entry.key}
            name={isArray ? undefined : entry.key}
            node={entry.node}
            depth={depth + 1}
            isLast={i === node.entries.length - 1}
          />
        ))}

      {!collapsed && !isEmpty && (
        <div className={styles.line} style={indent}>
          <span className={jsonStyles.gutter} />
          <span className={jsonStyles.punctuation}>{close}</span>
          {comma}
        </div>
      )}
    </>
  )
}

interface DiffViewerProps {
  before: unknown
  after: unknown
}

/** A structural, collapsible diff between two JSON-serializable values. */
export function DiffViewer({ before, after }: DiffViewerProps) {
  const root = useMemo(() => diffJson(before, after), [before, after])
  const total = useMemo(() => countDifferences(root), [root])

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span>{total === 0 ? 'No differences' : `${total} difference${total === 1 ? '' : 's'}`}</span>
        <span>
          <span className={styles.legendDot} style={{ background: 'var(--danger-dot)' }} />
          Removed
        </span>
        <span>
          <span className={styles.legendDot} style={{ background: 'var(--success-dot)' }} />
          Added
        </span>
      </div>
      <DiffNodeView name={undefined} node={root} depth={0} isLast />
    </div>
  )
}
