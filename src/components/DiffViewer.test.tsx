import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DiffViewer } from './DiffViewer'

describe('DiffViewer', () => {
  it('shows "No differences" and no +/- markers for identical values', () => {
    render(<DiffViewer before={{ a: 1, b: 'x' }} after={{ a: 1, b: 'x' }} />)
    expect(screen.getByText('No differences')).toBeInTheDocument()
    expect(screen.queryByText('+')).not.toBeInTheDocument()
  })

  it('counts and labels a single changed value', () => {
    render(<DiffViewer before={{ a: 1 }} after={{ a: 2 }} />)
    expect(screen.getByText('1 difference')).toBeInTheDocument()
    // Changed primitives render as a struck-through old line and a new line.
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('pluralizes the summary for multiple differences', () => {
    render(<DiffViewer before={{ a: 1, b: 2 }} after={{ a: 10, b: 20 }} />)
    expect(screen.getByText('2 differences')).toBeInTheDocument()
  })

  it('shows an added key', () => {
    render(<DiffViewer before={{ a: 1 }} after={{ a: 1, b: 2 }} />)
    expect(screen.getByText('"b"')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows a removed key', () => {
    render(<DiffViewer before={{ a: 1, b: 2 }} after={{ a: 1 }} />)
    expect(screen.getByText('"b"')).toBeInTheDocument()
  })

  it('renders a whole added nested object via the JSON tree, not as separate diff lines', () => {
    render(<DiffViewer before={{}} after={{ user: { name: 'Ada', roles: ['admin'] } }} />)
    expect(screen.getByText('"name"')).toBeInTheDocument()
    expect(screen.getByText('"Ada"')).toBeInTheDocument()
  })

  it('collapses and expands a nested object', async () => {
    const user = userEvent.setup()
    render(<DiffViewer before={{ user: { name: 'Ada' } }} after={{ user: { name: 'Grace' } }} />)

    expect(screen.getByText('"Ada"')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse user' }))
    expect(screen.queryByText('"Ada"')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 1 keys differ')).toBeInTheDocument()
  })

  it('summarizes a collapsed branch by its own differing keys, never more than it has', async () => {
    const user = userEvent.setup()
    // "address" has 2 direct keys: "city" (changed) and "geo" (an object with
    // 2 of its own changed keys nested inside). The collapsed summary must
    // report "2 of 2 keys differ" — never "3 of 2", which is what counting
    // leaf differences recursively (instead of direct children) would give.
    render(
      <DiffViewer
        before={{ address: { city: 'A', geo: { lat: '1', lng: '2' } } }}
        after={{ address: { city: 'B', geo: { lat: '9', lng: '9' } } }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse address' }))
    expect(screen.getByText('2 of 2 keys differ')).toBeInTheDocument()
  })

  it('diffs arrays by index', () => {
    render(<DiffViewer before={[1, 2, 3]} after={[1, 2]} />)
    expect(screen.getByText('1 difference')).toBeInTheDocument()
  })
})
