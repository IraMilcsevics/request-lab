import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JsonEditor } from './JsonEditor'

describe('JsonEditor', () => {
  it('shows the current value in the textarea', () => {
    render(<JsonEditor value='{"a":1}' onChange={vi.fn()} ariaLabel="Request body (JSON)" />)
    expect(screen.getByLabelText('Request body (JSON)')).toHaveValue('{"a":1}')
  })

  it('reports typed text via onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<JsonEditor value="" onChange={onChange} ariaLabel="Request body (JSON)" />)

    await user.type(screen.getByLabelText('Request body (JSON)'), 'x')
    expect(onChange).toHaveBeenCalledWith('x')
  })

  it('shows the placeholder when empty', () => {
    render(<JsonEditor value="" onChange={vi.fn()} placeholder="type here" ariaLabel="Request body (JSON)" />)
    expect(screen.getByPlaceholderText('type here')).toBeInTheDocument()
  })

  it('renders the highlighted overlay with the same text, token by token', () => {
    const { container } = render(<JsonEditor value='{"a": 1}' onChange={vi.fn()} ariaLabel="Request body (JSON)" />)
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()
    // The overlay is decorative — it must never intercept clicks/typing meant
    // for the real textarea sitting on top of it.
    expect(pre).toHaveAttribute('aria-hidden', 'true')
    expect(pre?.textContent).toContain('"a"')
    expect(pre?.textContent).toContain('1')
  })

  it('does not crash on text that is not valid JSON yet (mid-typing)', () => {
    expect(() => render(<JsonEditor value='{"a": ' onChange={vi.fn()} ariaLabel="Request body (JSON)" />)).not.toThrow()
  })
})
