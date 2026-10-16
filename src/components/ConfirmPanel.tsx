import type { ReactNode } from 'react'
import styles from './ConfirmPanel.module.css'

interface ConfirmPanelProps {
  children: ReactNode
  error?: string
  success?: ReactNode
  cancelLabel?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

/** A dismissible inline panel — body content, an optional error or success line, and a Cancel/Confirm footer — shared by the cURL-import and save-as-variable flows. */
export function ConfirmPanel({
  children,
  error,
  success,
  cancelLabel = 'Cancel',
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmPanelProps) {
  return (
    <div className={styles.panel}>
      {children}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        {success && <span className={styles.success}>{success}</span>}
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
