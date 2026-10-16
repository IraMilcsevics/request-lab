import { useState } from 'react'

const FEEDBACK_DURATION_MS = 1500

/** Copies text to the clipboard and tracks a brief "Copied" flash; a failed write (blocked permissions, insecure context) is swallowed since the text is still on screen to copy by hand. */
export function useCopyFeedback() {
  const [copied, setCopied] = useState(false)

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), FEEDBACK_DURATION_MS)
    } catch {
      // Clipboard access can be blocked — nothing to recover from here.
    }
  }

  return { copied, copy }
}
