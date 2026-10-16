import type { KeyValue } from './types'

/** Keeps only enabled rows with a non-blank key — the one invariant every param/header/variable list shares when deciding what actually takes effect. */
export function filterEnabledKeyValues(items: KeyValue[]): KeyValue[] {
  return items.filter((item) => item.enabled && item.key.trim() !== '')
}
