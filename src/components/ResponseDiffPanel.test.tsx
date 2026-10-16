import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryEntry } from '../types/ui'
import { ResponseDiffPanel } from './ResponseDiffPanel'

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'id',
    draft: { method: 'GET', url: 'https://api.example.com/users/1', params: [], headers: [], timeoutMs: 5000 },
    result: {
      ok: true,
      response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json: {}, durationMs: 10 },
    },
    sentAt: 1000,
    ...overrides,
  }
}

describe('ResponseDiffPanel', () => {
  it('always shows the earlier request as Before and the later as After, regardless of selection order', () => {
    const earlier = entry({ id: 'a', sentAt: 1000, draft: { method: 'GET', url: 'https://api.example.com/users/1', params: [], headers: [], timeoutMs: 5000 } })
    const later = entry({ id: 'b', sentAt: 2000, draft: { method: 'GET', url: 'https://api.example.com/users/2', params: [], headers: [], timeoutMs: 5000 } })

    // Pass them in reverse (later picked first) order.
    render(<ResponseDiffPanel entries={[later, earlier]} onClose={vi.fn()} />)

    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
    expect(screen.getByText('api.example.com/users/1')).toBeInTheDocument()
    expect(screen.getByText('api.example.com/users/2')).toBeInTheDocument()
  })

  it('shows status badges for both sides', () => {
    const a = entry({ id: 'a', sentAt: 1000, result: { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json: {}, durationMs: 10 } } })
    const b = entry({ id: 'b', sentAt: 2000, result: { ok: true, response: { status: 404, statusText: 'Not Found', headers: {}, rawBody: '{}', json: {}, durationMs: 10 } } })
    render(<ResponseDiffPanel entries={[a, b]} onClose={vi.fn()} />)

    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('calls onClose when the Close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const a = entry({ id: 'a', sentAt: 1000 })
    const b = entry({ id: 'b', sentAt: 2000 })
    render(<ResponseDiffPanel entries={[a, b]} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a fallback message when either side has no JSON response', () => {
    const a = entry({ id: 'a', sentAt: 1000, result: { ok: false, error: { kind: 'network', message: 'Failed to fetch' } } })
    const b = entry({ id: 'b', sentAt: 2000 })
    render(<ResponseDiffPanel entries={[a, b]} onClose={vi.fn()} />)

    expect(screen.getByText('Only requests with a JSON response can be compared.')).toBeInTheDocument()
  })

  it('renders the diff when both sides have JSON', () => {
    const a = entry({ id: 'a', sentAt: 1000, result: { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json: { name: 'Ada' }, durationMs: 10 } } })
    const b = entry({ id: 'b', sentAt: 2000, result: { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json: { name: 'Grace' }, durationMs: 10 } } })
    render(<ResponseDiffPanel entries={[a, b]} onClose={vi.fn()} />)

    expect(screen.getByText('"Ada"')).toBeInTheDocument()
    expect(screen.getByText('"Grace"')).toBeInTheDocument()
  })
})
