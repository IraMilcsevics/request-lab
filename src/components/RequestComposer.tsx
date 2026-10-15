import { buildRequest } from '../api-client'
import type { HttpMethod, KeyValue, RequestDraft } from '../api-client'
import { isValidJson } from '../lib/json'
import type { RequestTab } from '../types/ui'
import { KeyValueTable } from './KeyValueTable'
import styles from './RequestComposer.module.css'

const TABS: Array<{ key: RequestTab; label: string }> = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
]

const METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'DELETE']

interface RequestComposerProps {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  body: string
  timeoutMs: number
  activeTab: RequestTab
  onTabChange: (tab: RequestTab) => void
  onParamsChange: (rows: KeyValue[]) => void
  onHeadersChange: (rows: KeyValue[]) => void
  onBodyChange: (body: string) => void
}

export function RequestComposer({
  method,
  url,
  params,
  headers,
  body,
  timeoutMs,
  activeTab,
  onTabChange,
  onParamsChange,
  onHeadersChange,
  onBodyChange,
}: RequestComposerProps) {
  const bodyIsInvalid = activeTab === 'body' && !isValidJson(body)

  const draft: RequestDraft = { method, url, params, headers, body, timeoutMs }
  const built = buildRequest(draft)
  const hasExtraParams = params.some((p) => p.enabled && p.key.trim() !== '')

  return (
    <div className={styles.card}>
      <div className={styles.tabBar} role="tablist" aria-label="Request editor">
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

      {activeTab === 'params' && (
        <>
          {hasExtraParams && (
            <div className={styles.effectiveUrl}>
              {built.ok ? (
                <>
                  Effective URL: <code>{built.built.url}</code>
                </>
              ) : (
                <span className={styles.bodyError}>Fix the URL in the top bar to preview the query string.</span>
              )}
            </div>
          )}
          <KeyValueTable rows={params} onChange={onParamsChange} addLabel="Add parameter" keyPlaceholder="key" valuePlaceholder="value" />
        </>
      )}

      {activeTab === 'headers' && (
        <KeyValueTable rows={headers} onChange={onHeadersChange} addLabel="Add header" keyPlaceholder="header" valuePlaceholder="value" />
      )}

      {activeTab === 'body' && (
        <div className={styles.bodyWrap}>
          {METHODS_WITHOUT_BODY.includes(method) && (
            <div className={styles.bodyNote}>{method} requests usually don't send a body — it will still be sent if you fill it in.</div>
          )}
          <textarea
            className={styles.bodyEditor}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            aria-label="Request body (JSON)"
            spellCheck={false}
          />
          {bodyIsInvalid && <div className={styles.bodyError}>This isn't valid JSON — fix it before sending.</div>}
        </div>
      )}
    </div>
  )
}
