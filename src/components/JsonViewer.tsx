import { JsonTree } from './JsonTree'

interface JsonViewerProps {
  value: unknown
}

/** Pretty-prints and syntax-highlights a JSON-serializable value as a collapsible tree. */
export function JsonViewer({ value }: JsonViewerProps) {
  return <JsonTree value={value} />
}
