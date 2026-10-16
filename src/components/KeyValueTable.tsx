import { useState } from 'react'
import type { KeyValue } from '../api-client'
import { createId } from '../lib/id'
import { CheckIcon, PlusIcon, TrashIcon } from './icons'
import styles from './KeyValueTable.module.css'

interface KeyValueTableProps {
  rows: KeyValue[]
  onChange: (rows: KeyValue[]) => void
  addLabel: string
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KeyValueTable({
  rows,
  onChange,
  addLabel,
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
}: KeyValueTableProps) {
  // KeyValue has no id of its own, and using the array index as the React
  // key would let a deleted row's DOM node (and any focus in it) get
  // silently reassigned to a different logical row. These synthetic ids are
  // kept in lockstep with `rows` by addRow/removeRow for every change that
  // originates here. `lastRows` detects `rows` being replaced wholesale
  // from outside (e.g. loading a different saved request) and regenerates
  // fresh identities during render — correct, since that's an entirely
  // different set of logical rows — rather than via an effect, which would
  // cost an extra render and briefly key the new rows by stale ids.
  const [ids, setIds] = useState<string[]>(() => rows.map(() => createId()))
  const [lastRows, setLastRows] = useState(rows)
  if (rows !== lastRows) {
    setLastRows(rows)
    if (ids.length !== rows.length) setIds(rows.map(() => createId()))
  }

  function updateRow(index: number, patch: Partial<KeyValue>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeRow(index: number) {
    setIds((prev) => prev.filter((_, i) => i !== index))
    onChange(rows.filter((_, i) => i !== index))
  }

  function addRow() {
    setIds((prev) => [...prev, createId()])
    onChange([...rows, { key: '', value: '', enabled: true }])
  }

  return (
    <div className={styles.wrap}>
      {rows.length > 0 && (
        <div className={styles.headerRow}>
          <span />
          <span>Key</span>
          <span>Value</span>
          <span />
        </div>
      )}

      {rows.map((row, index) => (
        <div key={ids[index]} className={`${styles.row} ${row.enabled ? '' : styles.disabled}`}>
          <span className={styles.checkboxWrap}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={row.enabled}
              onChange={(e) => updateRow(index, { enabled: e.target.checked })}
              aria-label={row.enabled ? `Disable ${row.key || keyPlaceholder}` : `Enable ${row.key || keyPlaceholder}`}
            />
            {row.enabled && <span className={styles.checkIcon}><CheckIcon /></span>}
          </span>
          <input
            type="text"
            className={styles.cell}
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => updateRow(index, { key: e.target.value })}
            aria-label="Name"
          />
          <input
            type="text"
            className={styles.cell}
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) => updateRow(index, { value: e.target.value })}
            aria-label="Value"
          />
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => removeRow(index)}
            aria-label={`Remove ${row.key || keyPlaceholder}`}
          >
            <TrashIcon />
          </button>
        </div>
      ))}

      <button type="button" className={styles.addRow} onClick={addRow}>
        <PlusIcon />
        {addLabel}
      </button>
    </div>
  )
}
