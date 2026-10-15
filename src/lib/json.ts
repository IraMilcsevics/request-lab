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

export type JsonTokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation'

export interface JsonToken {
  text: string
  type: JsonTokenType
}

const TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

/**
 * Splits arbitrary text into colorable tokens (keys, strings, numbers,
 * booleans, null, and everything else as plain "punctuation") for syntax
 * highlighting. Regex-based rather than a JSON parse, so it degrades
 * gracefully on text that isn't valid JSON yet — exactly the case while
 * someone is still typing a request body.
 */
export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  TOKEN_PATTERN.lastIndex = 0
  while ((match = TOKEN_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), type: 'punctuation' })
    }

    const matched = match[0]
    let type: JsonTokenType
    if (matched.startsWith('"')) {
      type = /:\s*$/.test(matched) ? 'key' : 'string'
    } else if (matched === 'true' || matched === 'false') {
      type = 'boolean'
    } else if (matched === 'null') {
      type = 'null'
    } else {
      type = 'number'
    }

    tokens.push({ text: matched, type })
    lastIndex = TOKEN_PATTERN.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), type: 'punctuation' })
  }

  return tokens
}
