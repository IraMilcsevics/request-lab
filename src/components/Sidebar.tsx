import { useRef, useState, type ChangeEvent } from 'react'
import { hasJsonBody } from '../api-client'
import type { KeyValue } from '../api-client'
import { displayUrl } from '../lib/displayUrl'
import { matchesUrl } from '../lib/filter'
import { formatRelativeTime } from '../lib/time'
import { describeResult, toneColors, toneForErrorKind, toneForMethod, toneForStatus } from '../lib/status'
import type { Collection, Environment, HistoryEntry, SavedRequest, SidebarTab } from '../types/ui'
import { BookmarkIcon, CopyIcon, PlusIcon, SearchIcon, TrashIcon } from './icons'
import { KeyValueTable } from './KeyValueTable'
import styles from './Sidebar.module.css'

const TABS: Array<{ key: SidebarTab; label: string }> = [
  { key: 'history', label: 'History' },
  { key: 'saved', label: 'Saved' },
  { key: 'env', label: 'Env' },
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
  collections: Collection[]
  onAddCollection: (name: string) => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, name: string) => void
  onMoveSavedToCollection: (requestId: string, collectionId: string | undefined) => void
  onExportSaved: () => string
  onImportSaved: (json: string) => { ok: true } | { ok: false; error: string }
  onClearHistory: () => void
  onDeleteHistoryEntry: (id: string) => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
  onClearCompare: () => void
  onStartCompare: () => void
  environments: Environment[]
  activeEnvironmentId: string | undefined
  onSelectEnvironment: (id: string | undefined) => void
  onAddEnvironment: (name: string) => void
  onDeleteEnvironment: (id: string) => void
  onRenameEnvironment: (id: string, name: string) => void
  onEnvironmentVariablesChange: (id: string, variables: KeyValue[]) => void
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
  collections,
  onAddCollection,
  onDeleteCollection,
  onRenameCollection,
  onMoveSavedToCollection,
  onExportSaved,
  onImportSaved,
  onClearHistory,
  onDeleteHistoryEntry,
  compareIds,
  onToggleCompare,
  onClearCompare,
  onStartCompare,
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onAddEnvironment,
  onDeleteEnvironment,
  onRenameEnvironment,
  onEnvironmentVariablesChange,
}: SidebarProps) {
  const [newEnvName, setNewEnvName] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [importError, setImportError] = useState<string | undefined>(undefined)
  const importInputRef = useRef<HTMLInputElement>(null)

  const visibleHistory = history.filter((entry) => matchesUrl(entry.draft.url, filter))
  const visibleSaved = saved.filter((item) => matchesUrl(item.draft.url, filter) || matchesUrl(item.name, filter))

  function handleAddEnvironment() {
    if (newEnvName.trim() === '') return
    onAddEnvironment(newEnvName)
    setNewEnvName('')
  }

  function handleAddCollection() {
    if (newCollectionName.trim() === '') return
    onAddCollection(newCollectionName)
    setNewCollectionName('')
  }

  function handleExport() {
    const json = onExportSaved()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'requestlab-collections.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be re-chosen later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const result = onImportSaved(text)
      setImportError(result.ok ? undefined : result.error)
    }
    reader.readAsText(file)
  }

  function renderSavedRow(item: SavedRequest) {
    return (
      <div key={item.id} className={styles.savedRow}>
        <button type="button" className={styles.savedMain} onClick={() => onSelectSaved(item)}>
          <BookmarkIcon size={14} />
          <span className={styles.savedText}>
            <span className={styles.savedName}>{item.name}</span>
            <span className={styles.savedUrl}>
              {item.draft.method} {displayUrl(item.draft.url)}
            </span>
          </span>
        </button>
        {collections.length > 0 && (
          <select
            className={styles.collectionSelect}
            value={item.collectionId ?? ''}
            onChange={(e) => onMoveSavedToCollection(item.id, e.target.value === '' ? undefined : e.target.value)}
            aria-label={`Move ${item.name} to collection`}
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
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
    )
  }

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

      {activeTab !== 'env' && (
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
      )}

      {activeTab === 'history' && (
        <div className={styles.list}>
          {history.length > 0 && (
            <button type="button" className={styles.clearAll} onClick={onClearHistory}>
              Clear history
            </button>
          )}

          {history.some((e) => hasJsonBody(e.result)) && (
            <div className={styles.compareBar}>
              <span className={styles.compareCount}>
                {compareIds.length === 0 ? 'Compare: pick 2 JSON responses' : `Compare: ${compareIds.length}/2 selected`}
              </span>
              {compareIds.length > 0 && (
                <button type="button" className={styles.compareClear} onClick={onClearCompare}>
                  Clear
                </button>
              )}
              <button type="button" className={styles.compareGo} onClick={onStartCompare} disabled={compareIds.length !== 2}>
                Compare
              </button>
            </div>
          )}

          {visibleHistory.length === 0 && <div className={styles.empty}>No requests sent yet.</div>}
          {visibleHistory.map((entry) => {
            const methodTone = toneColors(toneForMethod(entry.draft.method))
            const statusTone = entry.result.ok
              ? toneColors(toneForStatus(entry.result.response.status))
              : toneColors(toneForErrorKind(entry.result.error.kind))
            const statusLabel = describeResult(entry.result)
            const canCompare = hasJsonBody(entry.result)
            const isPicked = compareIds.includes(entry.id)
            return (
              <div key={entry.id} className={styles.historyRow}>
                {canCompare && (
                  <input
                    type="checkbox"
                    className={styles.compareCheckbox}
                    checked={isPicked}
                    disabled={!isPicked && compareIds.length >= 2}
                    onChange={() => onToggleCompare(entry.id)}
                    aria-label={`Select ${entry.draft.method} ${entry.draft.url} for comparison`}
                  />
                )}
                <button
                  type="button"
                  className={`${styles.row} ${entry.id === selectedHistoryId ? styles.rowSelected : ''}`}
                  onClick={() => onSelectHistory(entry)}
                >
                  <span className={styles.method} style={{ color: methodTone.fg }}>
                    {entry.draft.method}
                  </span>
                  <span className={styles.url}>{displayUrl(entry.draft.url)}</span>
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
          <div className={styles.savedToolbar}>
            <button type="button" className={styles.envAddButton} onClick={handleExport}>
              Export
            </button>
            <button type="button" className={styles.envAddButton} onClick={() => importInputRef.current?.click()}>
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className={styles.hiddenFileInput}
              onChange={handleImportFileChosen}
              aria-label="Import collections file"
            />
          </div>
          {importError && <div className={styles.importError}>Import failed: {importError}</div>}

          <div className={styles.envAddRow}>
            <input
              type="text"
              className={styles.envAddInput}
              placeholder="New collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCollection()
              }}
            />
            <button type="button" className={styles.envAddButton} onClick={handleAddCollection}>
              <PlusIcon />
              Add
            </button>
          </div>

          {visibleSaved.length === 0 && <div className={styles.empty}>Nothing saved yet.</div>}

          {collections.map((collection) => {
            const items = visibleSaved.filter((item) => item.collectionId === collection.id)
            return (
              <div key={collection.id} className={styles.envCard}>
                <div className={styles.envHeader}>
                  <input
                    type="text"
                    className={styles.envNameInput}
                    value={collection.name}
                    onChange={(e) => onRenameCollection(collection.id, e.target.value)}
                    aria-label="Collection name"
                  />
                  <button
                    type="button"
                    className={styles.savedDelete}
                    onClick={() => onDeleteCollection(collection.id)}
                    aria-label={`Delete collection ${collection.name}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className={styles.collectionItems}>
                  {items.length === 0 && <div className={styles.empty}>No requests in this collection.</div>}
                  {items.map(renderSavedRow)}
                </div>
              </div>
            )
          })}

          {collections.length > 0 && <div className={styles.groupLabel}>No collection</div>}
          {visibleSaved.filter((item) => !item.collectionId || !collections.some((c) => c.id === item.collectionId)).map(renderSavedRow)}
        </div>
      )}

      {activeTab === 'env' && (
        <div className={styles.list}>
          <div className={styles.envAddRow}>
            <input
              type="text"
              className={styles.envAddInput}
              placeholder="New environment name"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEnvironment()
              }}
            />
            <button type="button" className={styles.envAddButton} onClick={handleAddEnvironment}>
              <PlusIcon />
              Add
            </button>
          </div>

          <label className={styles.envNoneRow}>
            <input
              type="radio"
              name="activeEnvironment"
              className={styles.radio}
              checked={activeEnvironmentId === undefined}
              onChange={() => onSelectEnvironment(undefined)}
            />
            No environment
          </label>

          {environments.length === 0 && <div className={styles.empty}>No environments yet.</div>}

          {environments.map((env) => (
            <div key={env.id} className={styles.envCard}>
              <div className={styles.envHeader}>
                <input
                  type="radio"
                  name="activeEnvironment"
                  className={styles.radio}
                  checked={env.id === activeEnvironmentId}
                  onChange={() => onSelectEnvironment(env.id)}
                  aria-label={`Use ${env.name} environment`}
                />
                <input
                  type="text"
                  className={styles.envNameInput}
                  value={env.name}
                  onChange={(e) => onRenameEnvironment(env.id, e.target.value)}
                  aria-label="Environment name"
                />
                <button
                  type="button"
                  className={styles.savedDelete}
                  onClick={() => onDeleteEnvironment(env.id)}
                  aria-label={`Delete environment ${env.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
              <div className={styles.envVarsCard}>
                <KeyValueTable
                  rows={env.variables}
                  onChange={(rows) => onEnvironmentVariablesChange(env.id, rows)}
                  addLabel="Add variable"
                  keyPlaceholder="name"
                  valuePlaceholder="value"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
