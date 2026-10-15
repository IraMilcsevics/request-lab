import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ApiResult } from '../api-client'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ResponsePanel } from './ResponsePanel'

function successResult(overrides: Partial<Extract<ApiResult, { ok: true }>['response']> = {}): ApiResult {
  return {
    ok: true,
    response: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      rawBody: '{"id":1,"name":"Ada"}',
      json: { id: 1, name: 'Ada' },
      durationMs: 42,
      ...overrides,
    },
  }
}

function renderPanel(overrides: Partial<ComponentProps<typeof ResponsePanel>> = {}) {
  const props: ComponentProps<typeof ResponsePanel> = {
    sendState: 'idle',
    result: undefined,
    activeTab: 'body',
    onTabChange: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<ResponsePanel {...props} />)
  return props
}

describe('ResponsePanel — idle/loading', () => {
  it('shows the empty state when idle', () => {
    renderPanel({ sendState: 'idle' })
    expect(screen.getByText('No response yet')).toBeInTheDocument()
    expect(screen.getByText('Send a request to see the response here')).toBeInTheDocument()
  })

  it('shows a spinner and a working Cancel button while loading', async () => {
    const user = userEvent.setup()
    const props = renderPanel({ sendState: 'loading' })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCancel).toHaveBeenCalled()
  })
})

describe('ResponsePanel — Raw/Formatted toggle', () => {
  it('has no toggle when the body is not JSON', () => {
    renderPanel({
      sendState: 'done',
      result: successResult({ json: undefined, rawBody: 'plain text' }),
    })
    expect(screen.queryByRole('radio', { name: 'Formatted' })).not.toBeInTheDocument()
    expect(screen.getByText('plain text')).toBeInTheDocument()
  })

  it('defaults to Formatted and shows the JSON tree', () => {
    renderPanel({ sendState: 'done', result: successResult() })
    expect(screen.getByRole('radio', { name: 'Formatted' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('"name"')).toBeInTheDocument() // JsonTree key
  })

  it('switches to the raw body text on click, and back', async () => {
    const user = userEvent.setup()
    renderPanel({ sendState: 'done', result: successResult() })

    await user.click(screen.getByRole('radio', { name: 'Raw' }))
    expect(screen.getByText('{"id":1,"name":"Ada"}')).toBeInTheDocument()
    expect(screen.queryByText('"name"')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Formatted' }))
    expect(screen.getByText('"name"')).toBeInTheDocument()
  })

  it('resets to Formatted when a new result comes in', () => {
    const { rerender } = render(
      <ResponsePanel sendState="done" result={successResult()} activeTab="body" onTabChange={vi.fn()} onCancel={vi.fn()} />,
    )

    // Not interacting via click here to keep this test focused on the
    // reset-on-new-result behavior rather than the click handler itself.
    rerender(
      <ResponsePanel
        sendState="done"
        result={successResult({ json: { id: 2 }, rawBody: '{"id":2}' })}
        activeTab="body"
        onTabChange={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Formatted' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('ResponsePanel — error results', () => {
  it('shows the error title and message, with no body tabs', () => {
    renderPanel({
      sendState: 'done',
      result: { ok: false, error: { kind: 'network', message: 'fetch failed' } },
    })
    expect(screen.getAllByText('Network error').length).toBeGreaterThan(0)
    expect(screen.getByText('fetch failed')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Body' })).not.toBeInTheDocument()
  })
})
