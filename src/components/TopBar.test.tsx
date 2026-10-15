import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

function renderTopBar(overrides: Partial<ComponentProps<typeof TopBar>> = {}) {
  const props = {
    method: 'GET' as const,
    url: 'https://api.example.com/things',
    timeoutMs: 8000,
    sending: false,
    onMethodChange: vi.fn(),
    onUrlChange: vi.fn(),
    onTimeoutChange: vi.fn(),
    onSend: vi.fn(),
    onSaveCurrent: vi.fn(),
    ...overrides,
  }
  render(<TopBar {...props} />)
  return props
}

describe('TopBar timeout field', () => {
  it('shows the current timeout', () => {
    renderTopBar({ timeoutMs: 5000 })
    expect(screen.getByLabelText('Timeout in milliseconds')).toHaveValue(5000)
  })

  it('reports a new timeout when edited', async () => {
    const user = userEvent.setup()
    const onTimeoutChange = vi.fn()

    // A controlled numeric input needs its value prop to actually update as
    // the mock fires, or the DOM snaps back mid-edit — so wrap it in a tiny
    // stateful harness rather than a bare vi.fn().
    function Harness() {
      const [timeoutMs, setTimeoutMs] = useState(8000)
      return (
        <TopBar
          method="GET"
          url="https://api.example.com/things"
          timeoutMs={timeoutMs}
          sending={false}
          onMethodChange={() => {}}
          onUrlChange={() => {}}
          onTimeoutChange={(value) => {
            setTimeoutMs(value)
            onTimeoutChange(value)
          }}
          onSend={() => {}}
          onSaveCurrent={() => {}}
        />
      )
    }
    render(<Harness />)

    const input = screen.getByLabelText('Timeout in milliseconds')
    await user.clear(input)
    await user.type(input, '3000')

    expect(onTimeoutChange).toHaveBeenLastCalledWith(3000)
  })
})

describe('TopBar save popover', () => {
  it('only calls onSaveCurrent with a non-blank name', async () => {
    const user = userEvent.setup()
    const props = renderTopBar()

    await user.click(screen.getByRole('button', { name: 'Save this request' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(props.onSaveCurrent).not.toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText('Request name'), 'Get user')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(props.onSaveCurrent).toHaveBeenCalledWith('Get user')
  })
})
