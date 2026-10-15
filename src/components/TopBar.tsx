import { useState } from 'react'
import type { HttpMethod } from '../api-client'
import { toneColors, toneForMethod } from '../lib/status'
import { BookmarkIcon, SendIcon } from './icons'
import styles from './TopBar.module.css'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE']

interface TopBarProps {
  method: HttpMethod
  url: string
  sending: boolean
  onMethodChange: (method: HttpMethod) => void
  onUrlChange: (url: string) => void
  onSend: () => void
  onSaveCurrent: (name: string) => void
}

export function TopBar({ method, url, sending, onMethodChange, onUrlChange, onSend, onSaveCurrent }: TopBarProps) {
  const [savePopoverOpen, setSavePopoverOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  function confirmSave() {
    if (saveName.trim() === '') return
    onSaveCurrent(saveName)
    setSaveName('')
    setSavePopoverOpen(false)
  }

  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <div className={styles.logo}>R</div>
        <span className={styles.brandName}>RequestLab</span>
      </div>

      <div className={styles.composerRow}>
        <div className={styles.methodGroup} role="radiogroup" aria-label="HTTP method">
          {METHODS.map((m) => {
            const active = m === method
            const tone = toneColors(toneForMethod(m))
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                className={styles.methodButton}
                style={{ background: active ? tone.bg : 'transparent', color: active ? tone.fg : 'var(--text-faint)' }}
                onClick={() => onMethodChange(m)}
              >
                {m}
              </button>
            )
          })}
        </div>

        <div className={styles.urlField}>
          <input
            type="text"
            className={styles.urlInput}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://api.example.com/resource"
            aria-label="Request URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend()
            }}
          />
        </div>

        <button type="button" className={styles.sendButton} onClick={onSend} disabled={sending || url.trim() === ''}>
          <SendIcon />
          Send
        </button>
      </div>

      <div className={styles.right}>
        <span className={styles.mockBadge}>demo API</span>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Save this request"
          onClick={() => setSavePopoverOpen((open) => !open)}
        >
          <BookmarkIcon />
        </button>

        {savePopoverOpen && (
          <div className={styles.savePopover}>
            <input
              type="text"
              className={styles.saveInput}
              placeholder="Request name"
              value={saveName}
              autoFocus
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmSave()
                if (e.key === 'Escape') setSavePopoverOpen(false)
              }}
            />
            <div className={styles.saveActions}>
              <button type="button" className={styles.saveCancel} onClick={() => setSavePopoverOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.saveConfirm} onClick={confirmSave}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
