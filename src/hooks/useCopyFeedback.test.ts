import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyFeedback } from './useCopyFeedback'

beforeEach(() => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCopyFeedback', () => {
  it('starts with copied false', () => {
    const { result } = renderHook(() => useCopyFeedback())
    expect(result.current.copied).toBe(false)
  })

  it('sets copied to true after a successful copy, then false again after the flash duration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useCopyFeedback())

    await act(async () => {
      await result.current.copy('hello')
    })
    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(result.current.copied).toBe(false)
    vi.useRealTimers()
  })

  it('leaves copied false when the clipboard write fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const { result } = renderHook(() => useCopyFeedback())

    await act(async () => {
      await result.current.copy('hello')
    })

    await waitFor(() => expect(result.current.copied).toBe(false))
  })
})
