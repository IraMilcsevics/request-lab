import type { BuiltRequest } from './types'

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** Renders a built request as a copy-pastable `curl` command. */
export function toCurl({ url, init }: BuiltRequest): string {
  const parts = ['curl', '-X', init.method ?? 'GET']

  const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers)
  headers.forEach((value, key) => {
    parts.push('-H', shellQuote(`${key}: ${value}`))
  })

  if (typeof init.body === 'string' && init.body !== '') {
    parts.push('-d', shellQuote(init.body))
  }

  parts.push(shellQuote(url))
  return parts.join(' ')
}
