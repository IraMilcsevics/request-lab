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
    envVariables: {},
    activeTab: 'params',
    onTabChange: vi.fn(),
    onParamsChange: vi.fn(),
    onHeadersChange: vi.fn(),
    onBodyChange: vi.fn(),
    onImportCurl: vi.fn(() => ({ ok: true as const })),
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

  it('shows up for a templated URL even with no params, and resolves {{variables}}', () => {
    renderComposer({
      url: '{{baseUrl}}/users/{{id}}',
      envVariables: { baseUrl: 'https://api.example.com', id: '42' },
    })
    expect(screen.getByText('https://api.example.com/users/42')).toBeInTheDocument()
  })

  it('names the unresolved variable, rather than a generic "fix the URL"', () => {
    renderComposer({ url: '{{baseUrl}}/users', envVariables: {} })
    expect(screen.getByText(/Unresolved variable/)).toBeInTheDocument()
    expect(screen.getByText('{{baseUrl}}/users')).toBeInTheDocument()
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

  it('copies the curl command with {{variables}} already resolved', async () => {
    const user = userEvent.setup()
    renderComposer({ url: '{{baseUrl}}/things', envVariables: { baseUrl: 'https://api.example.com' } })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("'https://api.example.com/things'"))
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

describe('RequestComposer — Import cURL', () => {
  it('shows no panel until the button is clicked', () => {
    renderComposer()
    expect(screen.queryByLabelText('Paste a curl command')).not.toBeInTheDocument()
  })

  it('opens the panel, imports on click, and closes on success', async () => {
    const user = userEvent.setup()
    const onImportCurl = vi.fn(() => ({ ok: true as const }))
    renderComposer({ onImportCurl })

    await user.click(screen.getByRole('button', { name: 'Import cURL' }))
    const textarea = screen.getByLabelText('Paste a curl command')
    await user.type(textarea, "curl 'https://api.example.com/things'")
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(onImportCurl).toHaveBeenCalledWith("curl 'https://api.example.com/things'")
    expect(screen.queryByLabelText('Paste a curl command')).not.toBeInTheDocument()
  })

  it('shows the error and keeps the panel open on a failed import', async () => {
    const user = userEvent.setup()
    const onImportCurl = vi.fn(() => ({ ok: false as const, error: 'No URL found in the curl command.' }))
    renderComposer({ onImportCurl })

    await user.click(screen.getByRole('button', { name: 'Import cURL' }))
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByText('No URL found in the curl command.')).toBeInTheDocument()
    expect(screen.getByLabelText('Paste a curl command')).toBeInTheDocument()
  })

  it('closes without importing on Cancel', async () => {
    const user = userEvent.setup()
    const onImportCurl = vi.fn()
    renderComposer({ onImportCurl })

    await user.click(screen.getByRole('button', { name: 'Import cURL' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onImportCurl).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Paste a curl command')).not.toBeInTheDocument()
  })
})
