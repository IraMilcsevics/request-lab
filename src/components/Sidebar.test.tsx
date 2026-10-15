import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryEntry, SavedRequest } from '../types/ui'
import { Sidebar } from './Sidebar'

const draft = {
  method: 'GET' as const,
  url: 'https://api.example.com/users/1',
  params: [],
  headers: [],
  body: '',
  timeoutMs: 8000,
}

function historyEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'h1',
    draft,
    result: { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', durationMs: 50 } },
    sentAt: Date.now(),
    ...overrides,
  }
}

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  const props: ComponentProps<typeof Sidebar> = {
    activeTab: 'history',
    onTabChange: vi.fn(),
    filter: '',
    onFilterChange: vi.fn(),
    history: [],
    saved: [],
    selectedHistoryId: undefined,
    onSelectHistory: vi.fn(),
    onSelectSaved: vi.fn(),
    onDeleteSaved: vi.fn(),
    ...overrides,
  }
  render(<Sidebar {...props} />)
  return props
}

describe('Sidebar history', () => {
  it('shows an empty message with no history', () => {
    renderSidebar({ history: [] })
    expect(screen.getByText('No requests sent yet.')).toBeInTheDocument()
  })

  it('gives the status dot an accessible label, not just a color', () => {
    renderSidebar({ history: [historyEntry()] })
    // A sighted user hovers, a screen reader user gets the same text via
    // visually-hidden content — color alone is never the only signal.
    expect(screen.getByText('200 OK')).toBeInTheDocument()
  })

  it('labels an errored entry by its error kind, not a raw code', () => {
    renderSidebar({
      history: [
        historyEntry({
          id: 'h2',
          result: { ok: false, error: { kind: 'network', message: 'fetch failed' } },
        }),
      ],
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('calls onSelectHistory when a row is clicked', async () => {
    const user = userEvent.setup()
    const entry = historyEntry()
    const props = renderSidebar({ history: [entry] })

    await user.click(screen.getByText('api.example.com/users/1'))
    expect(props.onSelectHistory).toHaveBeenCalledWith(entry)
  })

  it('filters history rows by URL substring', () => {
    renderSidebar({
      history: [historyEntry({ id: 'a', draft: { ...draft, url: 'https://api.example.com/users' } }), historyEntry({ id: 'b', draft: { ...draft, url: 'https://api.example.com/sessions' } })],
      filter: 'sessions',
    })
    expect(screen.queryByText('api.example.com/users')).not.toBeInTheDocument()
    expect(screen.getByText('api.example.com/sessions')).toBeInTheDocument()
  })
})

describe('Sidebar saved', () => {
  const saved: SavedRequest = { id: 's1', name: 'Get user', draft }

  it('shows an empty message with nothing saved', () => {
    renderSidebar({ activeTab: 'saved', saved: [] })
    expect(screen.getByText('Nothing saved yet.')).toBeInTheDocument()
  })

  it('calls onSelectSaved and onDeleteSaved', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved', saved: [saved] })

    await user.click(screen.getByText('Get user'))
    expect(props.onSelectSaved).toHaveBeenCalledWith(saved)

    await user.click(screen.getByRole('button', { name: 'Delete saved request Get user' }))
    expect(props.onDeleteSaved).toHaveBeenCalledWith('s1')
  })
})
