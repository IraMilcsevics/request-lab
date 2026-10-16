import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Collection, Environment, HistoryEntry, SavedRequest } from '../types/ui'
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
    result: { ok: true, response: { status: 200, statusText: 'OK', headers: {}, rawBody: '{}', json: {}, durationMs: 50 } },
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
    collections: [],
    onAddCollection: vi.fn(),
    onDeleteCollection: vi.fn(),
    onRenameCollection: vi.fn(),
    onMoveSavedToCollection: vi.fn(),
    onExportSaved: vi.fn(() => '{}'),
    onImportSaved: vi.fn(() => ({ ok: true as const })),
    onClearHistory: vi.fn(),
    onDeleteHistoryEntry: vi.fn(),
    compareIds: [],
    onToggleCompare: vi.fn(),
    onClearCompare: vi.fn(),
    onStartCompare: vi.fn(),
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

describe('Sidebar collections', () => {
  const collection: Collection = { id: 'c1', name: 'Auth' }
  const savedInCollection: SavedRequest = { id: 's1', name: 'Login', draft, collectionId: 'c1' }
  const savedUncategorized: SavedRequest = { id: 's2', name: 'Get user', draft }

  it('shows no "No collection" label when there are no collections yet', () => {
    renderSidebar({ activeTab: 'saved', saved: [savedUncategorized] })
    expect(screen.queryByText('No collection')).not.toBeInTheDocument()
    expect(screen.getByText('Get user')).toBeInTheDocument()
  })

  it('adds a collection from the name field', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved' })

    await user.type(screen.getByPlaceholderText('New collection name'), 'Auth')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(props.onAddCollection).toHaveBeenCalledWith('Auth')
  })

  it('groups saved requests under their collection, with uncategorized ones under "No collection"', () => {
    renderSidebar({
      activeTab: 'saved',
      collections: [collection],
      saved: [savedInCollection, savedUncategorized],
    })

    expect(screen.getByLabelText('Collection name')).toHaveValue('Auth')
    expect(screen.getByText('Login')).toBeInTheDocument()
    // "No collection" also appears as a <select> option — scope to the group label div.
    expect(screen.getByText('No collection', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByText('Get user')).toBeInTheDocument()
  })

  it('shows an empty-collection message when a collection has no requests', () => {
    renderSidebar({ activeTab: 'saved', collections: [collection], saved: [] })
    expect(screen.getByText('No requests in this collection.')).toBeInTheDocument()
  })

  it('renames a collection by editing its name field', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved', collections: [collection], saved: [savedInCollection] })

    await user.type(screen.getByLabelText('Collection name'), 'X')
    expect(props.onRenameCollection).toHaveBeenCalledWith('c1', 'AuthX')
  })

  it('deletes a collection', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved', collections: [collection], saved: [savedInCollection] })

    await user.click(screen.getByRole('button', { name: 'Delete collection Auth' }))
    expect(props.onDeleteCollection).toHaveBeenCalledWith('c1')
  })

  it('moves a request to another collection via its select', async () => {
    const user = userEvent.setup()
    const other: Collection = { id: 'c2', name: 'Other' }
    const props = renderSidebar({
      activeTab: 'saved',
      collections: [collection, other],
      saved: [savedInCollection],
    })

    await user.selectOptions(screen.getByLabelText('Move Login to collection'), 'c2')
    expect(props.onMoveSavedToCollection).toHaveBeenCalledWith('s1', 'c2')
  })

  it('moves a request back to "No collection"', async () => {
    const user = userEvent.setup()
    const props = renderSidebar({ activeTab: 'saved', collections: [collection], saved: [savedInCollection] })

    await user.selectOptions(screen.getByLabelText('Move Login to collection'), '')
    expect(props.onMoveSavedToCollection).toHaveBeenCalledWith('s1', undefined)
  })

  it('exports by calling onExportSaved and triggering a download', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const props = renderSidebar({ activeTab: 'saved' })
    await user.click(screen.getByRole('button', { name: 'Export' }))

    expect(props.onExportSaved).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    vi.unstubAllGlobals()
  })

  it('imports a chosen file and reports a parse error', async () => {
    const user = userEvent.setup()
    const onImportSaved = vi.fn(() => ({ ok: false as const, error: 'That file is not valid JSON.' }))
    renderSidebar({ activeTab: 'saved', onImportSaved })

    const file = new File(['not json'], 'collections.json', { type: 'application/json' })
    const input = screen.getByLabelText('Import collections file')
    await user.upload(input, file)

    await waitFor(() => expect(onImportSaved).toHaveBeenCalledWith('not json'))
    expect(await screen.findByText(/Import failed: That file is not valid JSON\./)).toBeInTheDocument()
  })
})

describe('Sidebar — response compare', () => {
  it('shows no compare bar when no history entry has a JSON response', () => {
    renderSidebar({
      history: [historyEntry({ result: { ok: false, error: { kind: 'network', message: 'x' } } })],
    })
    expect(screen.queryByText(/Compare:/)).not.toBeInTheDocument()
  })

  it('shows a compare checkbox only for entries with a JSON response', () => {
    const jsonEntry = historyEntry({ id: 'j1' })
    const errorEntry = historyEntry({
      id: 'e1',
      result: { ok: false, error: { kind: 'network', message: 'x' } },
    })
    renderSidebar({ history: [jsonEntry, errorEntry] })

    expect(screen.getByLabelText(/Select GET .* for comparison/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Select GET .* for comparison/)).toHaveLength(1)
  })

  it('toggles a selection via its checkbox', async () => {
    const user = userEvent.setup()
    const entry = historyEntry()
    const props = renderSidebar({ history: [entry] })

    await user.click(screen.getByLabelText(/Select GET .* for comparison/))
    expect(props.onToggleCompare).toHaveBeenCalledWith('h1')
  })

  it('disables unchecked checkboxes once 2 are already selected', () => {
    const a = historyEntry({ id: 'a' })
    const b = historyEntry({ id: 'b' })
    const c = historyEntry({ id: 'c' })
    renderSidebar({ history: [a, b, c], compareIds: ['a', 'b'] })

    const checkboxes = screen.getAllByLabelText(/Select GET .* for comparison/)
    expect(checkboxes[0]).not.toBeDisabled() // a — already selected, stays togglable
    expect(checkboxes[1]).not.toBeDisabled() // b — already selected, stays togglable
    expect(checkboxes[2]).toBeDisabled() // c — a 3rd pick is blocked
  })

  it('enables Compare only once exactly 2 are selected', () => {
    renderSidebar({ history: [historyEntry()], compareIds: ['h1'] })
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled()
  })

  it('calls onStartCompare and onClearCompare', async () => {
    const user = userEvent.setup()
    const a = historyEntry({ id: 'a' })
    const b = historyEntry({ id: 'b' })
    const props = renderSidebar({ history: [a, b], compareIds: ['a', 'b'] })

    expect(screen.getByRole('button', { name: 'Compare' })).not.toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Compare' }))
    expect(props.onStartCompare).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onClearCompare).toHaveBeenCalled()
  })
})
