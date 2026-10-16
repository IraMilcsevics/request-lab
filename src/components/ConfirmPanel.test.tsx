import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmPanel } from './ConfirmPanel'

describe('ConfirmPanel', () => {
  it('renders its children, and calls onCancel/onConfirm from the matching buttons', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <ConfirmPanel confirmLabel="Save" onCancel={onCancel} onConfirm={onConfirm}>
        <p>Body content</p>
      </ConfirmPanel>,
    )

    expect(screen.getByText('Body content')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('uses a custom cancel label when given one', () => {
    render(
      <ConfirmPanel confirmLabel="Import" cancelLabel="Nevermind" onCancel={vi.fn()} onConfirm={vi.fn()}>
        <p>x</p>
      </ConfirmPanel>,
    )
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeInTheDocument()
  })

  it('shows an error line only when an error is given', () => {
    const { rerender } = render(
      <ConfirmPanel confirmLabel="Save" onCancel={vi.fn()} onConfirm={vi.fn()}>
        <p>x</p>
      </ConfirmPanel>,
    )
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument()

    rerender(
      <ConfirmPanel confirmLabel="Save" error="Something went wrong." onCancel={vi.fn()} onConfirm={vi.fn()}>
        <p>x</p>
      </ConfirmPanel>,
    )
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })

  it('shows a success line only when given one', () => {
    render(
      <ConfirmPanel confirmLabel="Save" success="Saved as {{userId}}" onCancel={vi.fn()} onConfirm={vi.fn()}>
        <p>x</p>
      </ConfirmPanel>,
    )
    expect(screen.getByText('Saved as {{userId}}')).toBeInTheDocument()
  })
})
