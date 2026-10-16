import { Fragment, useState } from 'react'
import { hasJsonBody } from '../api-client'
import type { ApiResult } from '../api-client'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { formatBytes, utf8ByteLength } from '../lib/bytes'
import { errorHint, errorTitle, toneForErrorKind, toneForStatus, toneStyle } from '../lib/status'
import type { ResponseTab, SendState } from '../types/ui'
import { AlertIcon, CopyIcon, InboxIcon, LinkIcon, SpinnerIcon } from './icons'
import { JsonViewer } from './JsonViewer'
import styles from './ResponsePanel.module.css'

const TABS: Array<{ key: ResponseTab; label: string }> = [
  { key: 'body', label: 'Body' },
  { key: 'headers', label: 'Headers' },
]

interface ResponsePanelProps {
  sendState: SendState
  result: ApiResult | undefined
  activeTab: ResponseTab
  onTabChange: (tab: ResponseTab) => void
  onCancel: () => void
  onExtractVariable: (path: string, name: string) => { ok: true } | { ok: false; error: string }
}

export function ResponsePanel({ sendState, result, activeTab, onTabChange, onCancel, onExtractVariable }: ResponsePanelProps) {
  const { copied, copy } = useCopyFeedback()
  const [bodyView, setBodyView] = useState<'formatted' | 'raw'>('formatted')
  const [chainPanelOpen, setChainPanelOpen] = useState(false)
  const [chainPath, setChainPath] = useState('')
  const [chainName, setChainName] = useState('')
  const [chainError, setChainError] = useState<string | undefined>(undefined)
  const [chainSaved, setChainSaved] = useState(false)
  const [lastResult, setLastResult] = useState(result)

  // Each new response starts back in Formatted view, with the "save as
  // variable" panel closed, even if the previous one was left mid-edit.
  if (result !== lastResult) {
    setLastResult(result)
    setBodyView('formatted')
    setChainPanelOpen(false)
    setChainError(undefined)
    setChainSaved(false)
  }

  function handleExtractVariable() {
    const outcome = onExtractVariable(chainPath, chainName)
    if (outcome.ok) {
      setChainError(undefined)
      setChainSaved(true)
      setTimeout(() => setChainSaved(false), 1500)
    } else {
      setChainError(outcome.error)
      setChainSaved(false)
    }
  }

  function copyBody() {
    if (!result?.ok) return
    void copy(result.response.rawBody)
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {sendState === 'loading' && (
          <>
            <div className={styles.hint}>
              <SpinnerIcon />
              Sending request&hellip;
            </div>
            <button type="button" className={styles.iconButton} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {sendState === 'idle' && <span className={styles.hint}>No response yet</span>}

        {sendState === 'done' && result?.ok && (
          <>
            <div className={styles.headerGroup}>
              <span className={styles.badge} style={toneStyle(toneForStatus(result.response.status))}>
                {result.response.status} {result.response.statusText}
              </span>
              <span className={styles.meta}>{Math.round(result.response.durationMs)} ms</span>
              <span className={styles.meta}>{formatBytes(utf8ByteLength(result.response.rawBody))}</span>
            </div>
            <div className={styles.headerActions}>
              {hasJsonBody(result) && (
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => {
                    setChainPanelOpen((open) => !open)
                    setChainError(undefined)
                  }}
                >
                  <LinkIcon />
                  Save as variable
                </button>
              )}
              <button type="button" className={styles.iconButton} onClick={copyBody}>
                <CopyIcon />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </>
        )}

        {sendState === 'done' && result && !result.ok && (
          <div className={styles.headerGroup}>
            <span className={styles.badge} style={toneStyle(toneForErrorKind(result.error.kind))}>
              {errorTitle(result.error.kind)}
            </span>
            {result.error.durationMs !== undefined && <span className={styles.meta}>{Math.round(result.error.durationMs)} ms</span>}
          </div>
        )}
      </div>

      {chainPanelOpen && hasJsonBody(result) && (
        <div className={styles.chainPanel}>
          <div className={styles.chainRow}>
            <label className={styles.chainLabel}>
              JSON path
              <input
                type="text"
                className={styles.chainInput}
                value={chainPath}
                onChange={(e) => setChainPath(e.target.value)}
                placeholder="data.id or items[0].name"
                spellCheck={false}
              />
            </label>
            <label className={styles.chainLabel}>
              Variable name
              <input
                type="text"
                className={styles.chainInput}
                value={chainName}
                onChange={(e) => setChainName(e.target.value)}
                placeholder="userId"
                spellCheck={false}
              />
            </label>
          </div>
          {chainError && <div className={styles.bodyError}>{chainError}</div>}
          <div className={styles.chainPanelActions}>
            {chainSaved && <span className={styles.chainSaved}>Saved as {'{{' + chainName.trim() + '}}'}</span>}
            <button type="button" className={styles.curlCancel} onClick={() => setChainPanelOpen(false)}>
              Cancel
            </button>
            <button type="button" className={styles.curlConfirm} onClick={handleExtractVariable}>
              Save
            </button>
          </div>
        </div>
      )}

      {sendState === 'done' && result?.ok && (
        <>
          <div className={styles.tabBar} role="tablist" aria-label="Response viewer">
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

            {activeTab === 'body' && hasJsonBody(result) && (
              <div className={styles.viewToggle} role="radiogroup" aria-label="Body view">
                <button
                  type="button"
                  role="radio"
                  aria-checked={bodyView === 'formatted'}
                  className={`${styles.viewToggleButton} ${bodyView === 'formatted' ? styles.viewToggleActive : ''}`}
                  onClick={() => setBodyView('formatted')}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={bodyView === 'raw'}
                  className={`${styles.viewToggleButton} ${bodyView === 'raw' ? styles.viewToggleActive : ''}`}
                  onClick={() => setBodyView('raw')}
                >
                  Raw
                </button>
              </div>
            )}
          </div>

          <div className={styles.content}>
            {activeTab === 'body' &&
              (hasJsonBody(result) && bodyView === 'formatted' ? (
                <JsonViewer value={result.response.json} />
              ) : (
                <pre className={styles.rawBody}>{result.response.rawBody || '(empty body)'}</pre>
              ))}

            {activeTab === 'headers' && (
              <div className={styles.headersTable}>
                {Object.entries(result.response.headers).map(([key, value]) => (
                  <Fragment key={key}>
                    <div className={styles.headerKey}>{key}</div>
                    <div className={styles.headerValue}>{value}</div>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {sendState === 'done' && result && !result.ok && (
        <div className={styles.content}>
          <div className={styles.errorCard}>
            <AlertIcon size={22} />
            <div>
              <p className={styles.errorTitle}>{errorTitle(result.error.kind)}</p>
              <p className={styles.errorMessage}>{result.error.message}</p>
              {errorHint(result.error.kind) && <p className={styles.errorHint}>{errorHint(result.error.kind)}</p>}
            </div>
          </div>
        </div>
      )}

      {sendState === 'idle' && (
        <div className={styles.emptyState}>
          <InboxIcon />
          <span className={styles.emptyLabel}>Send a request to see the response here</span>
        </div>
      )}

      {sendState === 'loading' && (
        <div className={styles.emptyState}>
          <SpinnerIcon size={28} />
        </div>
      )}
    </div>
  )
}
