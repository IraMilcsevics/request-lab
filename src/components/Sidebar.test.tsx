import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Environment, HistoryEntry, SavedRequest } from '../types/ui'
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
    onDuplicateSaved: vi.fn(),
    onClearHistory: vi.fn(),
    onDeleteHistoryEntry: vi.fn(),
    environments: [],
    activeEnvironmentId: undefined,
    onSelectEnvironment: vi.fn(),
    onAddEnvironment: vi.fn(),
    onDeleteEnvironment: vi.fn(),
    onRenameEnvironment: vi.fn(),
    onEnvironmentVariablesChange: vi.fn(),
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

  it('hides the "Clear history" button when there is no history', () => {
    renderSidebar({ history: [] })
    expect(screen.queryByRole('button', { name: 'Clear history' })).not.toBeInTheDocument()
  })

  it('calls onClearHistory from the "Clear history" button', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ history: [historyEntry()] })

    await user.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(props.onClearHistory).toHaveBeenCalled()
  })

  it('deletes a single history entry without triggering onSelectHistory', async () => {
    const user = userEvent.setup()
    const entry = historyEntry()
    const props = renderSidebar({ history: [entry] })

    await user.click(screen.getByRole('button', { name: /Delete history entry/ }))
    expect(props.onDeleteHistoryEntry).toHaveBeenCalledWith(entry.id)
    expect(props.onSelectHistory).not.toHaveBeenCalled()
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

  it('calls onDuplicateSaved from the duplicate button, without selecting or deleting', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved', saved: [saved] })

    await user.click(screen.getByRole('button', { name: 'Duplicate saved request Get user' }))

    expect(props.onDuplicateSaved).toHaveBeenCalledWith('s1')
    expect(props.onSelectSaved).not.toHaveBeenCalled()
    expect(props.onDeleteSaved).not.toHaveBeenCalled()
  })
})

describe('Sidebar environments', () => {
  const env: Environment = {
    id: 'e1',
    name: 'Local',
    variables: [{ key: 'baseUrl', value: 'https://api.example.com', enabled: true }],
  }

  it('shows an empty message with no environments, but still offers "No environment"', () => {
    renderSidebar({ activeTab: 'env', environments: [] })
    expect(screen.getByText('No environments yet.')).toBeInTheDocument()
    expect(screen.getByText('No environment')).toBeInTheDocument()
  })

  it('adds an environment from the name field and activates it', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env' })

    await user.type(screen.getByPlaceholderText('New environment name'), 'Local')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(props.onAddEnvironment).toHaveBeenCalledWith('Local')
  })

  it('does not add a blank-named environment', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env' })

    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(props.onAddEnvironment).not.toHaveBeenCalled()
  })

  it('selects an environment as active via its radio button', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env', environments: [env] })

    await user.click(screen.getByRole('radio', { name: 'Use Local environment' }))
    expect(props.onSelectEnvironment).toHaveBeenCalledWith('e1')
  })

  it('switches back to "No environment"', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env', environments: [env], activeEnvironmentId: 'e1' })

    await user.click(screen.getByRole('radio', { name: 'No environment' }))
    expect(props.onSelectEnvironment).toHaveBeenCalledWith(undefined)
  })

  it('renames an environment by editing its name field', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env', environments: [env] })

    const nameInput = screen.getByLabelText('Environment name')
    await user.type(nameInput, 'X')

    expect(props.onRenameEnvironment).toHaveBeenCalledWith('e1', 'LocalX')
  })

  it('deletes an environment', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env', environments: [env] })

    await user.click(screen.getByRole('button', { name: 'Delete environment Local' }))
    expect(props.onDeleteEnvironment).toHaveBeenCalledWith('e1')
  })

  it('shows the environment’s variables and reports changes to them', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'env', environments: [env] })

    expect(screen.getByDisplayValue('baseUrl')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://api.example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add variable' }))
    expect(props.onEnvironmentVariablesChange).toHaveBeenCalledWith('e1', [
      ...env.variables,
      { key: '', value: '', enabled: true },
    ])
  })
})
