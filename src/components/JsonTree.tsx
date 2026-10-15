import { useState } from 'react'
import { ChevronRightIcon } from './icons'
import styles from './JsonTree.module.css'

type JsonValue = unknown

function isContainer(value: JsonValue): value is Record<string, JsonValue> | JsonValue[] {
  return value !== null && typeof value === 'object'
}

function entriesOf(value: Record<string, JsonValue> | JsonValue[]): Array<[string, JsonValue]> {
  return Array.isArray(value) ? value.map((v, i) => [String(i), v] as [string, JsonValue]) : Object.entries(value)
}

interface PrimitiveSpanProps {
  value: JsonValue
}

function PrimitiveSpan({ value }: PrimitiveSpanProps) {
  if (typeof value === 'string') return <span className={styles.string}>{JSON.stringify(value)}</span>
  if (typeof value === 'number') return <span className={styles.number}>{JSON.stringify(value)}</span>
  if (typeof value === 'boolean') return <span className={styles.boolean}>{String(value)}</span>
  return <span className={styles.null}>null</span>
}

interface JsonNodeProps {
  name: string | undefined
  value: JsonValue
  depth: number
  isLast: boolean
}

function JsonNode({ name, value, depth, isLast }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(false)
  const indent = { paddingLeft: depth * 14 }

  const keyLabel = name !== undefined && (
    <>
      <span className={styles.key}>"{name}"</span>
      <span className={styles.punctuation}>: </span>
    </>
  )

  if (!isContainer(value)) {
    return (
      <div className={styles.line} style={indent}>
        <span className={styles.gutter} />
        {keyLabel}
        <PrimitiveSpan value={value} />
        {!isLast && <span className={styles.punctuation}>,</span>}
      </div>
    )
  }

  const isArray = Array.isArray(value)
  const open = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'
  const entries = entriesOf(value)
  const isEmpty = entries.length === 0
  const label = `${entries.length} ${isArray ? (entries.length === 1 ? 'item' : 'items') : entries.length === 1 ? 'key' : 'keys'}`

  return (
    <>
      <div className={styles.line} style={indent}>
        {isEmpty ? (
          <span className={styles.gutter} />
        ) : (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${name ?? 'value'}`}
          >
            <ChevronRightIcon size={9} className={`${styles.chevron} ${collapsed ? '' : styles.chevronExpanded}`} />
          </button>
        )}
        {keyLabel}
        <span className={styles.punctuation}>{open}</span>
        {collapsed && !isEmpty && <span className={styles.summary}> {label} </span>}
        {(collapsed || isEmpty) && (
          <>
            <span className={styles.punctuation}>{close}</span>
            {!isLast && <span className={styles.punctuation}>,</span>}
          </>
        )}
      </div>

      {!collapsed &&
        !isEmpty &&
        entries.map(([key, child], i) => (
          <JsonNode key={key} name={isArray ? undefined : key} value={child} depth={depth + 1} isLast={i === entries.length - 1} />
        ))}

      {!collapsed && !isEmpty && (
        <div className={styles.line} style={indent}>
          <span className={styles.gutter} />
          <span className={styles.punctuation}>{close}</span>
          {!isLast && <span className={styles.punctuation}>,</span>}
        </div>
      )}
    </>
  )
}

interface JsonTreeProps {
  value: JsonValue
}

/** A collapsible, syntax-highlighted tree view of a JSON-serializable value. */
export function JsonTree({ value }: JsonTreeProps) {
  return (
    <div className={styles.tree}>
      <JsonNode name={undefined} value={value} depth={0} isLast />
    </div>
  )
}
