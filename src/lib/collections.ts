import type { HttpMethod, KeyValue, RequestDraft } from '../api-client'
import type { Collection, SavedRequest } from '../types/ui'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const EXPORT_VERSION = 1

export interface CollectionsExport {
  version: number
  collections: Collection[]
  saved: SavedRequest[]
}

/** Serializes the saved requests and their collections to a pretty-printed, importable JSON string. */
export function serializeCollections(collections: Collection[], saved: SavedRequest[]): string {
  const data: CollectionsExport = { version: EXPORT_VERSION, collections, saved }
  return JSON.stringify(data, null, 2)
}

export type ParseResult = { ok: true; collections: Collection[]; saved: SavedRequest[] } | { ok: false; error: string }

function isCollection(value: unknown): value is Collection {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Collection).id === 'string' &&
    typeof (value as Collection).name === 'string'
  )
}

function isKeyValue(value: unknown): value is KeyValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as KeyValue).key === 'string' &&
    typeof (value as KeyValue).value === 'string' &&
    typeof (value as KeyValue).enabled === 'boolean'
  )
}

function isRequestDraft(value: unknown): value is RequestDraft {
  if (typeof value !== 'object' || value === null) return false
  const v = value as RequestDraft
  return (
    HTTP_METHODS.includes(v.method) &&
    typeof v.url === 'string' &&
    Array.isArray(v.params) &&
    v.params.every(isKeyValue) &&
    Array.isArray(v.headers) &&
    v.headers.every(isKeyValue) &&
    (v.body === undefined || typeof v.body === 'string') &&
    typeof v.timeoutMs === 'number'
  )
}

function isSavedRequest(value: unknown): value is SavedRequest {
  if (typeof value !== 'object' || value === null) return false
  const v = value as SavedRequest
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isRequestDraft(v.draft) &&
    (v.collectionId === undefined || typeof v.collectionId === 'string')
  )
}

/**
 * Parses a previously-exported collections file. Deliberately lenient about
 * the `version` field (only this shape has ever existed) but strict about
 * the actual data, so a malformed or unrelated JSON file is rejected with a
 * clear reason rather than silently importing garbage.
 */
export function parseCollectionsImport(json: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Expected a collections export object.' }
  }

  const { collections, saved } = data as Partial<CollectionsExport>
  if (!Array.isArray(collections) || !collections.every(isCollection)) {
    return { ok: false, error: 'Missing or malformed "collections" list.' }
  }
  if (!Array.isArray(saved) || !saved.every(isSavedRequest)) {
    return { ok: false, error: 'Missing or malformed "saved" list.' }
  }

  return { ok: true, collections, saved }
}
