import { useRef } from 'react'
import { tokenizeJson } from '../lib/json'
import styles from './JsonEditor.module.css'

const CLASS_FOR_TYPE: Record<string, string | undefined> = {
  key: styles.key,
  string: styles.string,
  number: styles.number,
  boolean: styles.boolean,
  null: styles.null,
}

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
}

/**
 * A plain `<textarea>` with a syntax-highlighted JSON overlay underneath it —
 * the classic "transparent textarea on top of a colored <pre>" technique.
 * Tokenizing is regex-based (see lib/json.ts), so it highlights sensibly
 * even while the text isn't valid JSON yet, mid-edit.
 */
export function JsonEditor({ value, onChange, placeholder, ariaLabel }: JsonEditorProps) {
  const highlightRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function syncScroll() {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const tokens = tokenizeJson(value)

  return (
    <div className={styles.wrap}>
      <pre ref={highlightRef} className={styles.highlight} aria-hidden="true">
        {tokens.map((token, i) => (
          <span key={i} className={CLASS_FOR_TYPE[token.type]}>
            {token.text}
          </span>
        ))}
        {/* A trailing newline keeps the overlay's scroll height in sync with
            the textarea when the value itself ends with one. */}
        {'\n'}
      </pre>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
      />
    </div>
  )
}
