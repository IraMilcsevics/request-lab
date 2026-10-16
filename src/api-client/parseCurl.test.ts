import { describe, expect, it } from 'vitest'
import { buildRequest } from './buildRequest'
import { parseCurl } from './parseCurl'
import { toCurl } from './toCurl'
import type { RequestDraft } from './types'

describe('parseCurl — basics', () => {
  it('parses a plain GET with just a URL', () => {
    const result = parseCurl('curl https://api.example.com/things')
    expect(result).toEqual({
      ok: true,
      draft: { method: 'GET', url: 'https://api.example.com/things', params: [], headers: [], body: '', timeoutMs: 8000 },
    })
  })

  it('works without the leading "curl" token', () => {
    const result = parseCurl('https://api.example.com/things')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.url).toBe('https://api.example.com/things')
  })

  it('parses an explicit method via -X', () => {
    const result = parseCurl("curl -X PUT 'https://api.example.com/things'")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.method).toBe('PUT')
  })

  it('parses an explicit method via --request', () => {
    const result = parseCurl("curl --request DELETE 'https://api.example.com/things/1'")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.method).toBe('DELETE')
  })

  it('defaults to POST when a body is present but no -X is given, matching real curl', () => {
    const result = parseCurl(`curl -d '{"a":1}' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.method).toBe('POST')
  })

  it('defaults to GET with no body and no -X', () => {
    const result = parseCurl("curl 'https://api.example.com/things'")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.method).toBe('GET')
  })
})

describe('parseCurl — headers and body', () => {
  it('parses one or more -H headers', () => {
    const result = parseCurl(
      `curl -H 'Content-Type: application/json' -H 'X-Trace: abc' 'https://api.example.com/things'`,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.draft.headers).toEqual([
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Trace', value: 'abc', enabled: true },
      ])
    }
  })

  it('trims whitespace around header key/value', () => {
    const result = parseCurl(`curl -H 'X-Trace:   abc  ' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.headers[0]).toEqual({ key: 'X-Trace', value: 'abc', enabled: true })
  })

  it('parses a -d body', () => {
    const result = parseCurl(`curl -X POST -d '{"a":1}' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.body).toBe('{"a":1}')
  })

  it('also accepts --data, --data-raw and --data-binary', () => {
    for (const flag of ['--data', '--data-raw', '--data-binary']) {
      const result = parseCurl(`curl -X POST ${flag} 'x=1' 'https://api.example.com/things'`)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.draft.body).toBe('x=1')
    }
  })

  it('joins multiple -d flags with &, like real curl', () => {
    const result = parseCurl(`curl -d 'a=1' -d 'b=2' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.body).toBe('a=1&b=2')
  })

  it('sets no body (empty string) when there is no -d', () => {
    const result = parseCurl("curl 'https://api.example.com/things'")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.body).toBe('')
  })
})

describe('parseCurl — quoting', () => {
  it('unescapes a single-quoted value containing an embedded quote (shell-style)', () => {
    // This is exactly how toCurl()/a real shell represents a value with a literal '.
    const result = parseCurl(`curl -H 'X-Note: it'\\''s fine' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.headers[0].value).toBe("it's fine")
  })

  it('handles a double-quoted body with an escaped double quote', () => {
    const result = parseCurl(`curl -d "{\\"a\\":1}" "https://api.example.com/things"`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.body).toBe('{"a":1}')
  })

  it('collapses backslash line continuations across multiple lines', () => {
    const multiline = [`curl -X POST \\`, `  -H 'Content-Type: application/json' \\`, `  -d '{"a":1}' \\`, `  'https://api.example.com/things'`].join('\n')
    const result = parseCurl(multiline)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.draft.method).toBe('POST')
      expect(result.draft.headers).toEqual([{ key: 'Content-Type', value: 'application/json', enabled: true }])
      expect(result.draft.body).toBe('{"a":1}')
      expect(result.draft.url).toBe('https://api.example.com/things')
    }
  })
})

describe('parseCurl — auth and misc flags', () => {
  it('turns -u user:pass into a Basic auth header', () => {
    const result = parseCurl(`curl -u 'ada:secret' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.draft.headers).toEqual([{ key: 'Authorization', value: `Basic ${btoa('ada:secret')}`, enabled: true }])
    }
  })

  it('rejects a command truncated right after a flag that expects a value', () => {
    expect(parseCurl('curl https://api.example.com/things -X').ok).toBe(false)
    const result = parseCurl('curl https://api.example.com/things -X')
    expect(result).toEqual({ ok: false, error: '"-X" is missing its value — the command looks truncated.' })
  })

  it('does not throw on non-ASCII -u credentials, and round-trips through Basic decoding', () => {
    const result = parseCurl(`curl -u 'usér:pässwörd' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const header = result.draft.headers[0]
      expect(header.key).toBe('Authorization')
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.value.slice('Basic '.length)), (c) => c.charCodeAt(0)))
      expect(decoded).toBe('usér:pässwörd')
    }
  })

  it('maps -A/--user-agent to a User-Agent header', () => {
    const result = parseCurl(`curl -A 'MyAgent/1.0' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.headers).toEqual([{ key: 'User-Agent', value: 'MyAgent/1.0', enabled: true }])
  })

  it('maps -b/--cookie to a Cookie header', () => {
    const result = parseCurl(`curl -b 'session=abc' 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.headers).toEqual([{ key: 'Cookie', value: 'session=abc', enabled: true }])
  })

  it('maps --max-time (seconds) to timeoutMs', () => {
    const result = parseCurl(`curl --max-time 5 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.timeoutMs).toBe(5000)
  })

  it('ignores no-arg flags like --compressed, -s, -L, -i, -v, -k', () => {
    const result = parseCurl(`curl --compressed -s -L -i -v -k 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.url).toBe('https://api.example.com/things')
  })

  it('skips the value of an ignored arg-taking flag instead of mistaking it for the URL', () => {
    const result = parseCurl(`curl -o result.json 'https://api.example.com/things'`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.draft.url).toBe('https://api.example.com/things')
  })
})

describe('parseCurl — errors', () => {
  it('rejects empty input', () => {
    expect(parseCurl('')).toEqual({ ok: false, error: 'Paste a curl command to import.' })
    expect(parseCurl('   ')).toEqual({ ok: false, error: 'Paste a curl command to import.' })
  })

  it('rejects a command with no URL', () => {
    const result = parseCurl('curl -X POST')
    expect(result).toEqual({ ok: false, error: 'No URL found in the curl command.' })
  })

  it('rejects an unsupported method', () => {
    const result = parseCurl(`curl -X HEAD 'https://api.example.com/things'`)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unsupported method "HEAD"/)
  })
})

describe('parseCurl — round-trips with toCurl/buildRequest', () => {
  it('recovers an equivalent draft from its own toCurl() output', () => {
    const original: RequestDraft = {
      method: 'POST',
      url: 'https://api.example.com/things',
      params: [],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Trace', value: "weird 'quoted' value", enabled: true },
      ],
      body: '{"a":1,"b":"two"}',
      timeoutMs: 8000,
    }

    const built = buildRequest(original)
    expect(built.ok).toBe(true)
    if (!built.ok) return

    const curl = toCurl(built.built)
    const parsed = parseCurl(curl)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.draft.method).toBe('POST')
    expect(parsed.draft.url).toBe('https://api.example.com/things')
    expect(parsed.draft.body).toBe('{"a":1,"b":"two"}')
    // Headers normalize to lowercase through Headers — compare case-insensitively.
    const byLowerKey = Object.fromEntries(parsed.draft.headers.map((h) => [h.key.toLowerCase(), h.value]))
    expect(byLowerKey['content-type']).toBe('application/json')
    expect(byLowerKey['x-trace']).toBe("weird 'quoted' value")
  })
})
