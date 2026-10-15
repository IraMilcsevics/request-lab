import { matchesUrl } from '../lib/filter'
import { formatRelativeTime } from '../lib/time'
import { describeResult, toneColors, toneForErrorKind, toneForMethod, toneForStatus } from '../lib/status'
import type { HistoryEntry, SavedRequest, SidebarTab } from '../types/ui'
import { BookmarkIcon, CopyIcon, SearchIcon, TrashIcon } from './icons'
import styles from './Sidebar.module.css'

const TABS: Array<{ key: SidebarTab; label: string }> = [
  { key: 'history', label: 'History' },
  { key: 'saved', label: 'Saved' },
]

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  filter: string
  onFilterChange: (value: string) => void
  history: HistoryEntry[]
  saved: SavedRequest[]
  selectedHistoryId: string | undefined
  onSelectHistory: (entry: HistoryEntry) => void
  onSelectSaved: (item: SavedRequest) => void
  onDeleteSaved: (id: string) => void
  onDuplicateSaved: (id: string) => void
  onClearHistory: () => void
  onDeleteHistoryEntry: (id: string) => void
}

export function Sidebar({
  activeTab,
  onTabChange,
  filter,
  onFilterChange,
  history,
  saved,
  selectedHistoryId,
  onSelectHistory,
  onSelectSaved,
  onDeleteSaved,
  onDuplicateSaved,
  onClearHistory,
  onDeleteHistoryEntry,
}: SidebarProps) {
  const visibleHistory = history.filter((entry) => matchesUrl(entry.draft.url, filter))
  const visibleSaved = saved.filter((item) => matchesUrl(item.draft.url, filter) || matchesUrl(item.name, filter))

  return (
    <div className={styles.sidebar}>
      <div className={styles.tabBar} role="tablist" aria-label="Sidebar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className={styles.search}>
        <SearchIcon />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Filter requests"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
        />
      </label>

      {activeTab === 'history' && (
        <div className={styles.list}>
          {history.length > 0 && (
            <button type="button" className={styles.clearAll} onClick={onClearHistory}>
              Clear history
            </button>
          )}
          {visibleHistory.length === 0 && <div className={styles.empty}>No requests sent yet.</div>}
          {visibleHistory.map((entry) => {
            const methodTone = toneColors(toneForMethod(entry.draft.method))
            const statusTone = entry.result.ok
              ? toneColors(toneForStatus(entry.result.response.status))
              : toneColors(toneForErrorKind(entry.result.error.kind))
            const statusLabel = describeResult(entry.result)
            return (
              <div key={entry.id} className={styles.historyRow}>
                <button
                  type="button"
                  className={`${styles.row} ${entry.id === selectedHistoryId ? styles.rowSelected : ''}`}
                  onClick={() => onSelectHistory(entry)}
                >
                  <span className={styles.method} style={{ color: methodTone.fg }}>
                    {entry.draft.method}
                  </span>
                  <span className={styles.url}>{entry.draft.url.replace(/^https?:\/\//, '')}</span>
                  <span className={styles.dot} style={{ background: statusTone.fg }} title={statusLabel}>
                    <span className={styles.srOnly}>{statusLabel}</span>
                  </span>
                  <span className={styles.time}>{formatRelativeTime(entry.sentAt)}</span>
                </button>
                <button
                  type="button"
                  className={styles.savedDelete}
                  onClick={() => onDeleteHistoryEntry(entry.id)}
                  aria-label={`Delete history entry ${entry.draft.method} ${entry.draft.url}`}
                >
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className={styles.list}>
          {visibleSaved.length === 0 && <div className={styles.empty}>Nothing saved yet.</div>}
          {visibleSaved.map((item) => (
            <div key={item.id} className={styles.savedRow}>
              <button type="button" className={styles.savedMain} onClick={() => onSelectSaved(item)}>
                <BookmarkIcon size={14} />
                <span className={styles.savedText}>
                  <span className={styles.savedName}>{item.name}</span>
                  <span className={styles.savedUrl}>
                    {item.draft.method} {item.draft.url.replace(/^https?:\/\//, '')}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={styles.savedDelete}
                onClick={() => onDuplicateSaved(item.id)}
                aria-label={`Duplicate saved request ${item.name}`}
                title="Duplicate"
              >
                <CopyIcon />
              </button>
              <button
                type="button"
                className={styles.savedDelete}
                onClick={() => onDeleteSaved(item.id)}
                aria-label={`Delete saved request ${item.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
