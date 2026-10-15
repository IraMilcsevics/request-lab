import { formatJson, tokenizeJson } from '../lib/json'
import styles from './JsonViewer.module.css'

const CLASS_FOR_TYPE: Record<string, string | undefined> = {
  key: styles.key,
  string: styles.string,
  number: styles.number,
  boolean: styles.boolean,
  null: styles.null,
}

interface JsonViewerProps {
  value: unknown
}

/** Pretty-prints and syntax-highlights a JSON-serializable value. */
export function JsonViewer({ value }: JsonViewerProps) {
  const pretty = formatJson(value)
  const tokens = tokenizeJson(pretty)

  return (
    <pre className={styles.pre}>
      {tokens.map((token, i) => (
        <span key={i} className={CLASS_FOR_TYPE[token.type]}>
          {token.text}
        </span>
      ))}
    </pre>
  )
}
