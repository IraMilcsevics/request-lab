import { base64EncodeUtf8 } from '../lib/base64'
import type { Result } from '../lib/result'
import type { HttpMethod, KeyValue, RequestDraft } from './types'

const SUPPORTED_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const DEFAULT_TIMEOUT_MS = 8000

export type ParseCurlResult = Result<{ draft: RequestDraft }>

/**
 * Shell-style tokenizer: splits on whitespace, but a quoted span ('...' or
 * "..." ) and any backslash-escaped character are consumed literally, even
 * mid-token — so `'a'\''b'` (how a shell represents `a'b`, and exactly what
 * toCurl() emits for a value containing a quote) comes back as one token.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  const n = input.length

  while (i < n) {
    while (i < n && /\s/.test(input[i])) i++
    if (i >= n) break

    let token = ''
    let sawAny = false
    while (i < n && !/\s/.test(input[i])) {
      sawAny = true
      const ch = input[i]
      if (ch === "'") {
        i++
        while (i < n && input[i] !== "'") {
          token += input[i]
          i++
        }
        i++ // skip closing quote (or run off the end of an unterminated string)
      } else if (ch === '"') {
        i++
        while (i < n && input[i] !== '"') {
          if (input[i] === '\\' && i + 1 < n && '"\\$`'.includes(input[i + 1])) {
            token += input[i + 1]
            i += 2
          } else {
            token += input[i]
            i++
          }
        }
        i++
      } else if (ch === '\\') {
        i++
        if (i < n) {
          token += input[i]
          i++
        }
      } else {
        token += ch
        i++
      }
    }
    if (sawAny) tokens.push(token)
  }

  return tokens
}

// Flags curl accepts that take a value we don't map to anything on the
// draft — still need to skip that value so it isn't mistaken for the URL.
const IGNORED_FLAGS_WITH_ARG = new Set([
  '-o',
  '--output',
  '-x',
  '--proxy',
  '--cacert',
  '--cert',
  '--key',
  '--connect-timeout',
  '--retry',
])

// Every flag that consumes the next token as its value — used to detect a
// command truncated right after one of them (e.g. a paste cut off mid-copy),
// so that's reported as "malformed" instead of silently falling through to
// an inferred default for whatever the flag would have set.
const FLAGS_WITH_ARG = new Set([
  '-X',
  '--request',
  '-H',
  '--header',
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-ascii',
  '-u',
  '--user',
  '-A',
  '--user-agent',
  '-b',
  '--cookie',
  '-e',
  '--referer',
  '--max-time',
  ...IGNORED_FLAGS_WITH_ARG,
])

export function parseCurl(input: string): ParseCurlResult {
  // `\` line continuations (as produced by most "Copy as cURL" exports) —
  // collapse to one line before tokenizing.
  const normalized = input.replace(/\\\r?\n/g, ' ')
  const tokens = tokenize(normalized)
  if (tokens.length === 0) return { ok: false, error: 'Paste a curl command to import.' }

  let i = 0
  if (tokens[i]?.toLowerCase() === 'curl') i++

  let explicitMethod: string | undefined
  let url: string | undefined
  const headers: KeyValue[] = []
  let body: string | undefined
  let timeoutMs = DEFAULT_TIMEOUT_MS

  for (; i < tokens.length; i++) {
    const token = tokens[i]

    if (FLAGS_WITH_ARG.has(token) && i === tokens.length - 1) {
      return { ok: false, error: `"${token}" is missing its value — the command looks truncated.` }
    }

    if (token === '-X' || token === '--request') {
      explicitMethod = tokens[++i]
    } else if (token === '-H' || token === '--header') {
      const header = tokens[++i] ?? ''
      const colon = header.indexOf(':')
      if (colon !== -1) {
        headers.push({ key: header.slice(0, colon).trim(), value: header.slice(colon + 1).trim(), enabled: true })
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-ascii') {
      const value = tokens[++i] ?? ''
      body = body === undefined ? value : `${body}&${value}`
    } else if (token === '-u' || token === '--user') {
      const credentials = tokens[++i] ?? ''
      headers.push({ key: 'Authorization', value: `Basic ${base64EncodeUtf8(credentials)}`, enabled: true })
    } else if (token === '-A' || token === '--user-agent') {
      headers.push({ key: 'User-Agent', value: tokens[++i] ?? '', enabled: true })
    } else if (token === '-b' || token === '--cookie') {
      headers.push({ key: 'Cookie', value: tokens[++i] ?? '', enabled: true })
    } else if (token === '-e' || token === '--referer') {
      headers.push({ key: 'Referer', value: tokens[++i] ?? '', enabled: true })
    } else if (token === '--max-time') {
      const seconds = Number(tokens[++i])
      if (Number.isFinite(seconds) && seconds > 0) timeoutMs = Math.round(seconds * 1000)
    } else if (IGNORED_FLAGS_WITH_ARG.has(token)) {
      i++ // skip the flag's value, which we don't use
    } else if (token.startsWith('-')) {
      // An unrecognized flag — assume it takes no argument (true for the
      // common ones: --compressed, -s/--silent, -L/--location, -i, -v, -k).
    } else if (url === undefined) {
      url = token
    }
  }

  if (!url) return { ok: false, error: 'No URL found in the curl command.' }

  const method = (explicitMethod?.toUpperCase() ?? (body !== undefined ? 'POST' : 'GET')) as HttpMethod
  if (!SUPPORTED_METHODS.includes(method)) {
    return { ok: false, error: `Unsupported method "${method}" — only ${SUPPORTED_METHODS.join(', ')} are supported.` }
  }

  const draft: RequestDraft = {
    method,
    url,
    params: [],
    headers,
    body: body ?? '',
    timeoutMs,
  }

  return { ok: true, draft }
}
