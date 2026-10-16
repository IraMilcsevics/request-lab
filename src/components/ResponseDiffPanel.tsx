import { hasJsonBody } from '../api-client'
import { displayUrl } from '../lib/displayUrl'
import { toneColors, toneForMethod, toneForStatus, toneStyle } from '../lib/status'
import type { HistoryEntry } from '../types/ui'
import { DiffViewer } from './DiffViewer'
import styles from './ResponseDiffPanel.module.css'

interface ResponseDiffPanelProps {
  entries: [HistoryEntry, HistoryEntry]
  onClose: () => void
}

function SideHeader({ label, entry }: { label: string; entry: HistoryEntry }) {
  const methodTone = toneColors(toneForMethod(entry.draft.method))
  return (
    <div className={styles.side}>
      <span className={styles.sideLabel}>{label}</span>
      <span className={styles.sideMethod} style={{ color: methodTone.fg }}>
        {entry.draft.method}
      </span>
      <span className={styles.sideUrl}>{displayUrl(entry.draft.url)}</span>
      {entry.result.ok && (
        <span className={styles.sideBadge} style={toneStyle(toneForStatus(entry.result.response.status))}>
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
        {hasJsonBody(beforeEntry.result) && hasJsonBody(afterEntry.result) ? (
          <DiffViewer before={beforeEntry.result.response.json} after={afterEntry.result.response.json} />
        ) : (
          <p>Only requests with a JSON response can be compared.</p>
        )}
      </div>
    </div>
  )
}
