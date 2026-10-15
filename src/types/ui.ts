import type { ApiResult, KeyValue, RequestDraft } from '../api-client'

export interface HistoryEntry {
  id: string
  draft: RequestDraft
  result: ApiResult
  sentAt: number
}

export interface SavedRequest {
  id: string
  name: string
  draft: RequestDraft
}

export interface Environment {
  id: string
  name: string
  variables: KeyValue[]
}

export type RequestTab = 'params' | 'headers' | 'body'
export type ResponseTab = 'body' | 'headers'
export type SidebarTab = 'history' | 'saved' | 'env'
export type SendState = 'idle' | 'loading' | 'done'
