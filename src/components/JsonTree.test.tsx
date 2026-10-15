import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { JsonTree } from './JsonTree'

describe('JsonTree — rendering', () => {
  it('renders object keys and primitive values', () => {
    render(<JsonTree value={{ name: 'Ada', age: 36, active: true, nickname: null }} />)

    expect(screen.getByText('"name"')).toBeInTheDocument()
    expect(screen.getByText('"Ada"')).toBeInTheDocument()
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.getByText('true')).toBeInTheDocument()
    expect(screen.getByText('null')).toBeInTheDocument()
  })

  it('renders array items without key labels', () => {
    render(<JsonTree value={['admin', 'editor']} />)
    expect(screen.getByText('"admin"')).toBeInTheDocument()
    expect(screen.getByText('"editor"')).toBeInTheDocument()
    expect(screen.queryByText('"0"')).not.toBeInTheDocument()
  })

  it('renders nested objects and arrays', () => {
    render(<JsonTree value={{ user: { roles: ['admin'] } }} />)
    expect(screen.getByText('"user"')).toBeInTheDocument()
    expect(screen.getByText('"roles"')).toBeInTheDocument()
    expect(screen.getByText('"admin"')).toBeInTheDocument()
  })

  it('gives an empty object or array no toggle of its own', () => {
    render(<JsonTree value={{ empty: {}, list: [] }} />)
    // Only the root (which has 2 keys) gets a toggle — its empty children don't.
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /empty/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /list/ })).not.toBeInTheDocument()
  })
})

describe('JsonTree — collapse/expand', () => {
  it('starts fully expanded', () => {
    render(<JsonTree value={{ roles: ['admin', 'editor'] }} />)
    expect(screen.getByText('"admin"')).toBeInTheDocument()
  })

  it('hides children and shows an item-count summary when collapsed', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ roles: ['admin', 'editor'] }} />)

    await user.click(screen.getByRole('button', { name: 'Collapse roles' }))

    expect(screen.queryByText('"admin"')).not.toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('expands again on a second click, restoring the children', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ roles: ['admin', 'editor'] }} />)

    const toggle = screen.getByRole('button', { name: 'Collapse roles' })
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Expand roles' }))

    expect(screen.getByText('"admin"')).toBeInTheDocument()
    expect(screen.queryByText('2 items')).not.toBeInTheDocument()
  })

  it('collapses one node independently of its sibling', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ a: [1, 2], b: [3, 4] }} />)

    await user.click(screen.getByRole('button', { name: 'Collapse a' }))

    // "a" is collapsed (its items are gone)...
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    // ...but "b" is untouched.
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('uses singular wording for a single item/key', async () => {
    const user = userEvent.setup()
    render(<JsonTree value={{ roles: ['admin'], meta: { id: 1 } }} />)

    await user.click(screen.getByRole('button', { name: 'Collapse roles' }))
    expect(screen.getByText('1 item')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse meta' }))
    expect(screen.getByText('1 key')).toBeInTheDocument()
  })
})

describe('JsonTree — top-level values', () => {
  it('renders a bare array at the root', () => {
    render(<JsonTree value={[1, 2, 3]} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders a bare primitive at the root, with no toggle', () => {
    render(<JsonTree value={true} />)
    expect(screen.getByText('true')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// Sanity check that collapsing the outer object doesn't leave orphaned,
// still-interactive toggles for children that are no longer rendered.
describe('JsonTree — collapsing a parent removes its children from the DOM', () => {
  it('removes nested toggles when the parent collapses', async () => {
    const user = userEvent.setup()
    const { container } = render(<JsonTree value={{ outer: { inner: [1, 2] } }} />)

    await user.click(screen.getByRole('button', { name: 'Collapse outer' }))

    expect(within(container).queryByRole('button', { name: /inner/ })).not.toBeInTheDocument()
  })
})
