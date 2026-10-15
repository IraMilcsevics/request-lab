import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RequestComposer } from './RequestComposer'

function renderComposer(overrides: Partial<ComponentProps<typeof RequestComposer>> = {}) {
  const props: ComponentProps<typeof RequestComposer> = {
    method: 'GET',
    url: 'https://api.example.com/things',
    params: [],
    headers: [],
    body: '',
    timeoutMs: 8000,
    activeTab: 'params',
    onTabChange: vi.fn(),
    onParamsChange: vi.fn(),
    onHeadersChange: vi.fn(),
    onBodyChange: vi.fn(),
    ...overrides,
  }
  render(<RequestComposer {...props} />)
  return props
}

describe('RequestComposer effective URL preview', () => {
  it('stays hidden with no enabled params', () => {
    renderComposer({ params: [] })
    expect(screen.queryByText(/Effective URL/)).not.toBeInTheDocument()
  })

  it('shows the URL with enabled params appended, skipping disabled ones', () => {
    renderComposer({
      params: [
        { key: 'q', value: 'cats', enabled: true },
        { key: 'skip', value: 'me', enabled: false },
      ],
    })
    expect(screen.getByText('https://api.example.com/things?q=cats')).toBeInTheDocument()
  })

  it('hints to fix the URL when it is invalid', () => {
    renderComposer({
      url: 'not a url',
      params: [{ key: 'q', value: 'cats', enabled: true }],
    })
    expect(screen.getByText(/Fix the URL in the top bar/)).toBeInTheDocument()
  })
})

describe('RequestComposer — Copy as cURL', () => {
  it('copies a built request as a curl command', async () => {
    const user = userEvent.setup()
    renderComposer({
      method: 'POST',
      url: 'https://api.example.com/things',
      headers: [{ key: 'X-Trace', value: 'abc', enabled: true }],
      body: '{"a":1}',
    })

    // userEvent.setup() installs its own navigator.clipboard stub, so the
    // mock has to go in *after* that, not in a beforeEach.
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }))

    expect(writeText).toHaveBeenCalledWith(
      `curl -X POST -H 'content-type: application/json' -H 'x-trace: abc' -d '{"a":1}' 'https://api.example.com/things'`,
    )
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('is disabled when the URL cannot be built', async () => {
    renderComposer({ url: 'not a url' })
    expect(screen.getByRole('button', { name: 'Copy as cURL' })).toBeDisabled()
  })
})

describe('RequestComposer body tab', () => {
  it('flags invalid JSON live', () => {
    renderComposer({ activeTab: 'body', body: '{not valid' })
    expect(screen.getByText(/isn't valid JSON/)).toBeInTheDocument()
  })

  it('notes that GET/DELETE usually skip a body', () => {
    renderComposer({ activeTab: 'body', method: 'GET' })
    expect(screen.getByText(/usually don't send a body/)).toBeInTheDocument()
  })

  it('treats PATCH like POST/PUT — no "skips a body" note', () => {
    renderComposer({ activeTab: 'body', method: 'PATCH' })
    expect(screen.queryByText(/usually don't send a body/)).not.toBeInTheDocument()
  })
})
