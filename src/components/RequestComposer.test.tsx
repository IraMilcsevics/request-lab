import { render, screen } from '@testing-library/react'
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

describe('RequestComposer body tab', () => {
  it('flags invalid JSON live', () => {
    renderComposer({ activeTab: 'body', body: '{not valid' })
    expect(screen.getByText(/isn't valid JSON/)).toBeInTheDocument()
  })

  it('notes that GET/DELETE usually skip a body', () => {
    renderComposer({ activeTab: 'body', method: 'GET' })
    expect(screen.getByText(/usually don't send a body/)).toBeInTheDocument()
  })
})
