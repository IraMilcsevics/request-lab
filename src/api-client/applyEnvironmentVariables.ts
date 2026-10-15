import type { RequestDraft } from './types'

const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g

/**
 * Replaces every `{{name}}` placeholder in `text` with its value from
 * `variables`. A placeholder whose name isn't in `variables` is left
 * untouched — in the UI that's the signal that a variable is unresolved,
 * rather than silently sending the literal `{{name}}` as data.
 */
export function substituteVariables(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match,
  )
}

/**
 * Resolves `{{variable}}` placeholders across a request draft's URL, param
 * values, header values and body — everywhere a value could plausibly need
 * one. Keys are never substituted. Pure and network-free, like buildRequest,
 * so it's safe to call just to preview what will actually be sent.
 */
export function applyEnvironmentVariables(draft: RequestDraft, variables: Record<string, string>): RequestDraft {
  return {
    ...draft,
    url: substituteVariables(draft.url, variables),
    params: draft.params.map((p) => ({ ...p, value: substituteVariables(p.value, variables) })),
    headers: draft.headers.map((h) => ({ ...h, value: substituteVariables(h.value, variables) })),
    body: draft.body !== undefined ? substituteVariables(draft.body, variables) : draft.body,
  }
}
