export type JsonTokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation'

export interface JsonToken {
  text: string
  type: JsonTokenType
}

/** Pretty-prints a value the way the response/body editors display JSON. */
export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Empty or blank text counts as "no body", which is valid. */
export function isValidJson(text: string): boolean {
  if (text.trim() === '') return true
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

const TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

/**
 * Splits pretty-printed JSON text into colorable tokens (keys, strings,
 * numbers, booleans, null, punctuation/whitespace) for syntax highlighting.
 * Pure and string-based, so it works on any valid JSON text without
 * re-parsing it into a tree.
 */
export function tokenizeJson(pretty: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  TOKEN_PATTERN.lastIndex = 0
  while ((match = TOKEN_PATTERN.exec(pretty))) {
    if (match.index > lastIndex) {
      tokens.push({ text: pretty.slice(lastIndex, match.index), type: 'punctuation' })
    }

    const text = match[0]
    let type: JsonTokenType
    if (text.startsWith('"')) {
      type = /:\s*$/.test(text) ? 'key' : 'string'
    } else if (text === 'true' || text === 'false') {
      type = 'boolean'
    } else if (text === 'null') {
      type = 'null'
    } else {
      type = 'number'
    }

    tokens.push({ text, type })
    lastIndex = TOKEN_PATTERN.lastIndex
  }

  if (lastIndex < pretty.length) {
    tokens.push({ text: pretty.slice(lastIndex), type: 'punctuation' })
  }

  return tokens
}
