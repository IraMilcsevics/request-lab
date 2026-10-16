/** Strips a leading http(s) scheme for compact display in history/saved/diff lists. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}
