/** Case-insensitive substring match on a URL, used to filter the history/saved lists. */
export function matchesUrl(url: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  return url.toLowerCase().includes(q)
}
