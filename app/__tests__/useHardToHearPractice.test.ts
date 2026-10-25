import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHardToHearPractice } from '../hooks/useHardToHearPractice'

vi.mock('../lib/shuffle', () => ({ shuffleArray: <T,>(items: T[]) => items }))
vi.mock('../lib/requeue', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/requeue')>()),
  randomRequeueGap: () => 2,
}))

const line = (id: string, text: string) => ({ id, text, seconds: 1, endSeconds: 2, createdAt: '2024-01-01T00:00:00.000Z' })
const lines = [line('a', 'Een.'), line('b', 'Twee.'), line('c', 'Drie.'), line('d', 'Vier.')]

function answer(result: { current: ReturnType<typeof useHardToHearPractice> }, typed: string) {
  act(() => result.current.setInput(typed))
  act(() => result.current.check())
}

describe('useHardToHearPractice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks what I typed against the line', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    answer(result, 'een')

    expect(result.current.result?.correct).toBe(true)
    expect(result.current.index).toBe(0)
  })

  it('does not check an empty answer', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    answer(result, '  ')

    expect(result.current.result).toBeNull()
  })

  it('a correct line moves on and counts as goed', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))
    answer(result, 'een')

    act(() => result.current.next(true))

    expect(result.current.current?.id).toBe('b')
    expect(result.current.input).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.score).toEqual({ correct: 1, incorrect: 0 })
  })

  it('a wrong line comes back 2 lines later', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))
    answer(result, 'tien')

    act(() => result.current.next(false))

    expect(result.current.total).toBe(5)
    expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })
    for (const typed of ['twee', 'drie']) {
      answer(result, typed)
      act(() => result.current.next(true))
    }
    expect(result.current.current?.id).toBe('a')
  })

  it('is done after the last line, and stop() ends the session', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start([lines[0]]))
    answer(result, 'een')
    act(() => result.current.next(true))

    expect(result.current.done).toBe(true)

    act(() => result.current.stop())
    expect(result.current.active).toBe(false)
  })
})
