/** Formats a byte count the way the response panel shows response size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** UTF-8 byte length of a string — `.length` undercounts anything outside ASCII. */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}
