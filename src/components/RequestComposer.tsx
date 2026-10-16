import { useState } from 'react'
import { applyEnvironmentVariables, buildRequest, filterEnabledKeyValues, toCurl } from '../api-client'
import type { HttpMethod, KeyValue, RequestDraft } from '../api-client'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { applyAuthToHeaders, authStateFromHeaders } from '../lib/auth'
import type { AuthType } from '../lib/auth'
import { isValidJson } from '../lib/json'
import type { RequestTab } from '../types/ui'
import { CopyIcon, InboxIcon } from './icons'
import { JsonEditor } from './JsonEditor'
import { KeyValueTable } from './KeyValueTable'
import styles from './RequestComposer.module.css'

const TABS: Array<{ key: RequestTab; label: string }> = [
  { key: 'params', label: 'Params' },
  { key: 'auth', label: 'Auth' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
]

const AUTH_TYPES: Array<{ key: AuthType; label: string }> = [
  { key: 'none', label: 'No Auth' },
  { key: 'bearer', label: 'Bearer Token' },
  { key: 'basic', label: 'Basic Auth' },
]

const METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'DELETE']

interface RequestComposerProps {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  body: string
  timeoutMs: number
  envVariables: Record<string, string>
  activeTab: RequestTab
  onTabChange: (tab: RequestTab) => void
  onParamsChange: (rows: KeyValue[]) => void
  onHeadersChange: (rows: KeyValue[]) => void
  onBodyChange: (body: string) => void
  onImportCurl: (text: string) => { ok: true } | { ok: false; error: string }
}

export function RequestComposer({
  method,
  url,
  params,
  headers,
  body,
  timeoutMs,
  envVariables,
  activeTab,
  onTabChange,
  onParamsChange,
  onHeadersChange,
  onBodyChange,
  onImportCurl,
}: RequestComposerProps) {
  const { copied, copy } = useCopyFeedback()
  const [curlPanelOpen, setCurlPanelOpen] = useState(false)
  const [curlText, setCurlText] = useState('')
  const [curlError, setCurlError] = useState<string | undefined>(undefined)
  const bodyIsInvalid = activeTab === 'body' && !isValidJson(body)

  const rawDraft: RequestDraft = { method, url, params, headers, body, timeoutMs }
  // Preview and cURL export both show the request as it will actually be
  // sent — with any {{variables}} already resolved against the active
  // environment, not the raw template still shown in the editors above.
  const draft = applyEnvironmentVariables(rawDraft, envVariables)
  const built = buildRequest(draft)
  const hasExtraParams = filterEnabledKeyValues(params).length > 0
  const urlIsTemplated = url.includes('{{')
  const authState = authStateFromHeaders(headers)

  function setAuth(next: Parameters<typeof applyAuthToHeaders>[1]) {
    onHeadersChange(applyAuthToHeaders(headers, next))
  }

  function copyAsCurl() {
    if (!built.ok) return
    void copy(toCurl(built.built))
  }

  function handleImportCurl() {
    const result = onImportCurl(curlText)
    if (result.ok) {
      setCurlText('')
      setCurlError(undefined)
      setCurlPanelOpen(false)
    } else {
      setCurlError(result.error)
    }
  }

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
        <div className={styles.curlButtonGroup}>
          <button
            type="button"
            className={styles.curlButton}
            onClick={copyAsCurl}
            disabled={!built.ok}
            aria-label="Copy as cURL"
            title={built.ok ? undefined : 'Fix the URL in the top bar to copy this request as cURL.'}
          >
            <CopyIcon size={12} />
            <span className={styles.curlButtonLabel}>{copied ? 'Copied' : 'Copy as cURL'}</span>
          </button>
          <button
            type="button"
            className={styles.curlButton}
            onClick={() => {
              setCurlPanelOpen((open) => !open)
              setCurlError(undefined)
            }}
          >
            <InboxIcon size={12} />
            <span className={styles.curlButtonLabel}>Import cURL</span>
          </button>
        </div>
      </div>

      {curlPanelOpen && (
        <div className={styles.curlPanel}>
          <textarea
            className={styles.curlTextarea}
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder={`curl -X POST -H 'Content-Type: application/json' -d '{"key":"value"}' 'https://api.example.com/things'`}
            aria-label="Paste a curl command"
            spellCheck={false}
          />
          {curlError && <div className={styles.bodyError}>{curlError}</div>}
          <div className={styles.curlPanelActions}>
            <button type="button" className={styles.curlCancel} onClick={() => setCurlPanelOpen(false)}>
              Cancel
            </button>
            <button type="button" className={styles.curlConfirm} onClick={handleImportCurl}>
              Import
            </button>
          </div>
        </div>
      )}

      {activeTab === 'params' && (
        <>
          {(hasExtraParams || urlIsTemplated) && (
            <div className={styles.effectiveUrl}>
              {built.ok ? (
                <>
                  Effective URL: <code>{built.built.url}</code>
                </>
              ) : draft.url.includes('{{') ? (
                <span className={styles.bodyError}>
                  Unresolved variable in <code>{draft.url}</code> — define it in the active environment, or pick one in
                  the sidebar.
                </span>
              ) : (
                <span className={styles.bodyError}>Fix the URL in the top bar to preview the query string.</span>
              )}
            </div>
          )}
          <KeyValueTable rows={params} onChange={onParamsChange} addLabel="Add parameter" keyPlaceholder="key" valuePlaceholder="value" />
        </>
      )}

      {activeTab === 'auth' && (
        <div className={styles.authWrap}>
          <div className={styles.authTypeGroup} role="radiogroup" aria-label="Authorization type">
            {AUTH_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={authState.type === t.key}
                className={`${styles.authTypeButton} ${authState.type === t.key ? styles.authTypeButtonActive : ''}`}
                onClick={() => setAuth({ ...authState, type: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>

          {authState.type === 'none' && (
            <div className={styles.authNote}>This request won't include an Authorization header.</div>
          )}

          {authState.type === 'bearer' && (
            <label className={styles.authField}>
              <span className={styles.authFieldLabel}>Token</span>
              <input
                type="text"
                className={styles.authInput}
                value={authState.token ?? ''}
                onChange={(e) => setAuth({ ...authState, token: e.target.value })}
                placeholder="your-token-here"
                aria-label="Bearer token"
                spellCheck={false}
              />
            </label>
          )}

          {authState.type === 'basic' && (
            <>
              <label className={styles.authField}>
                <span className={styles.authFieldLabel}>Username</span>
                <input
                  type="text"
                  className={styles.authInput}
                  value={authState.username ?? ''}
                  onChange={(e) => setAuth({ ...authState, username: e.target.value })}
                  aria-label="Basic auth username"
                  spellCheck={false}
                />
              </label>
              <label className={styles.authField}>
                <span className={styles.authFieldLabel}>Password</span>
                <input
                  type="password"
                  className={styles.authInput}
                  value={authState.password ?? ''}
                  onChange={(e) => setAuth({ ...authState, password: e.target.value })}
                  aria-label="Basic auth password"
                />
              </label>
            </>
          )}

          {authState.type !== 'none' && (
            <div className={styles.authNote}>Sets the Authorization header on the Headers tab — edit it there directly too.</div>
          )}
        </div>
      )}

      {activeTab === 'headers' && (
        <KeyValueTable rows={headers} onChange={onHeadersChange} addLabel="Add header" keyPlaceholder="header" valuePlaceholder="value" />
      )}

      {activeTab === 'body' && (
        <div className={styles.bodyWrap}>
          {METHODS_WITHOUT_BODY.includes(method) && (
            <div className={styles.bodyNote}>{method} requests usually don't send a body — it will still be sent if you fill it in.</div>
          )}
          <JsonEditor
            value={body}
            onChange={onBodyChange}
            placeholder={'{\n  "key": "value"\n}'}
            ariaLabel="Request body (JSON)"
          />
          {bodyIsInvalid && <div className={styles.bodyError}>This isn't valid JSON — fix it before sending.</div>}
        </div>
      )}
    </div>
  )
}
