import type { ApiResult, RequestDraft } from '../api-client'

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

export type RequestTab = 'params' | 'headers' | 'body'
export type ResponseTab = 'body' | 'headers'
export type SidebarTab = 'history' | 'saved'
export type SendState = 'idle' | 'loading' | 'done'
