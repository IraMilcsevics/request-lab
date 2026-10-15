import { Fragment, useEffect, useState } from 'react'
import type { ApiResult } from '../api-client'
import { formatBytes, utf8ByteLength } from '../lib/bytes'
import { errorTitle, toneColors, toneForErrorKind, toneForStatus } from '../lib/status'
import type { ResponseTab, SendState } from '../types/ui'
import { AlertIcon, CopyIcon, InboxIcon, SpinnerIcon } from './icons'
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
}

export function ResponsePanel({ sendState, result, activeTab, onTabChange, onCancel }: ResponsePanelProps) {
  const [copied, setCopied] = useState(false)
  const [bodyView, setBodyView] = useState<'formatted' | 'raw'>('formatted')

  // Each new response starts back in Formatted view, even if the previous
  // one was left showing Raw.
  useEffect(() => {
    setBodyView('formatted')
  }, [result])

  async function copyBody() {
    if (!result?.ok) return
    try {
      await navigator.clipboard.writeText(result.response.rawBody)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked (permissions, insecure context); the
      // response text is still right there on screen to select manually.
    }
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
              {(() => {
                const tone = toneColors(toneForStatus(result.response.status))
                return (
                  <span className={styles.badge} style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>
                    {result.response.status} {result.response.statusText}
                  </span>
                )
              })()}
              <span className={styles.meta}>{Math.round(result.response.durationMs)} ms</span>
              <span className={styles.meta}>{formatBytes(utf8ByteLength(result.response.rawBody))}</span>
            </div>
            <button type="button" className={styles.iconButton} onClick={copyBody}>
              <CopyIcon />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        )}

        {sendState === 'done' && result && !result.ok && (
          <div className={styles.headerGroup}>
            {(() => {
              const tone = toneColors(toneForErrorKind(result.error.kind))
              return (
                <span className={styles.badge} style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>
                  {errorTitle(result.error.kind)}
                </span>
              )
            })()}
            {result.error.durationMs !== undefined && <span className={styles.meta}>{Math.round(result.error.durationMs)} ms</span>}
          </div>
        )}
      </div>

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

            {activeTab === 'body' && result.response.json !== undefined && (
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
              (result.response.json !== undefined && bodyView === 'formatted' ? (
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
