import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { KeyValue } from '../api-client'
import { KeyValueTable } from './KeyValueTable'

function rows(): KeyValue[] {
  return [
    { key: 'A', value: '1', enabled: true },
    { key: 'B', value: '2', enabled: true },
    { key: 'C', value: '3', enabled: true },
  ]
}

describe('KeyValueTable', () => {
  it('renders nothing (no header row) when there are no rows yet', () => {
    render(<KeyValueTable rows={[]} onChange={vi.fn()} addLabel="Add thing" />)
    expect(screen.queryByText('Key')).not.toBeInTheDocument()
    expect(screen.getByText('Add thing')).toBeInTheDocument()
  })

  it('addRow appends a blank enabled row', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<KeyValueTable rows={[]} onChange={onChange} addLabel="Add thing" />)

    await user.click(screen.getByText('Add thing'))
    expect(onChange).toHaveBeenCalledWith([{ key: '', value: '', enabled: true }])
  })

  it('removeRow removes exactly the clicked row', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<KeyValueTable rows={rows()} onChange={onChange} addLabel="Add thing" />)

    await user.click(screen.getByLabelText('Remove B'))
    expect(onChange).toHaveBeenCalledWith([
      { key: 'A', value: '1', enabled: true },
      { key: 'C', value: '3', enabled: true },
    ])
  })

  it('updateRow edits only the targeted field of the targeted row', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<KeyValueTable rows={rows()} onChange={onChange} addLabel="Add thing" />)

    const valueInputs = screen.getAllByLabelText('Value')
    await user.type(valueInputs[1], 'x')

    expect(onChange).toHaveBeenCalledWith([
      { key: 'A', value: '1', enabled: true },
      { key: 'B', value: '2x', enabled: true },
      { key: 'C', value: '3', enabled: true },
    ])
  })

  it('keeps a surviving row keyed by its own identity (not its array position) when an earlier row is removed', async () => {
    // Rows have no id of their own, so KeyValueTable assigns and tracks
    // synthetic ones itself, in lockstep with its own addRow/removeRow
    // handlers. That's what makes React reuse row B's existing DOM node
    // (rather than discard it and reuse row A's old node) when row A is
    // removed from above it — which is what lets the browser preserve
    // focus/selection/CSS-transition state on the row the user was actually
    // interacting with, instead of silently reassigning it to row B's data
    // onto what used to be a different row's DOM node.
    const user = userEvent.setup()
    function Wrapper() {
      const [data, setData] = useState(rows())
      return <KeyValueTable rows={data} onChange={setData} addLabel="Add thing" />
    }
    render(<Wrapper />)

    const bNodeBefore = screen.getAllByLabelText('Value')[1]
    await user.click(screen.getByLabelText('Remove A'))

    const afterInputs = screen.getAllByLabelText('Value')
    expect(afterInputs).toHaveLength(2)
    expect(afterInputs[0]).toBe(bNodeBefore)
  })
})
