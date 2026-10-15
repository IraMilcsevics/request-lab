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
