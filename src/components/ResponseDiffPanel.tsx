import { toneColors, toneForMethod, toneForStatus } from '../lib/status'
import type { HistoryEntry } from '../types/ui'
import { DiffViewer } from './DiffViewer'
import styles from './ResponseDiffPanel.module.css'

interface ResponseDiffPanelProps {
  entries: [HistoryEntry, HistoryEntry]
  onClose: () => void
}

function SideHeader({ label, entry }: { label: string; entry: HistoryEntry }) {
  const methodTone = toneColors(toneForMethod(entry.draft.method))
  const statusTone = entry.result.ok ? toneColors(toneForStatus(entry.result.response.status)) : undefined
  return (
    <div className={styles.side}>
      <span className={styles.sideLabel}>{label}</span>
      <span className={styles.sideMethod} style={{ color: methodTone.fg }}>
        {entry.draft.method}
      </span>
      <span className={styles.sideUrl}>{entry.draft.url.replace(/^https?:\/\//, '')}</span>
      {entry.result.ok && statusTone && (
        <span
          className={styles.sideBadge}
          style={{ background: statusTone.bg, color: statusTone.fg, borderColor: statusTone.border }}
        >
          {entry.result.response.status}
        </span>
      )}
    </div>
  )
}

/** Side-by-side headers plus a structural diff of two history entries' JSON bodies. */
export function ResponseDiffPanel({ entries, onClose }: ResponseDiffPanelProps) {
  // Always show the earlier request as "Before" and the later one as
  // "After", regardless of the order they were picked in.
  const [beforeEntry, afterEntry] = [...entries].sort((a, b) => a.sentAt - b.sentAt)

  const canDiff = beforeEntry.result.ok && afterEntry.result.ok && beforeEntry.result.response.json !== undefined && afterEntry.result.response.json !== undefined

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Comparing responses</span>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.sides}>
        <SideHeader label="Before" entry={beforeEntry} />
        <SideHeader label="After" entry={afterEntry} />
      </div>

      <div className={styles.content}>
        {canDiff && beforeEntry.result.ok && afterEntry.result.ok ? (
          <DiffViewer before={beforeEntry.result.response.json} after={afterEntry.result.response.json} />
        ) : (
          <p>Only requests with a JSON response can be compared.</p>
        )}
      </div>
    </div>
  )
}
