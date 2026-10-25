import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHardToHearPractice } from '../hooks/useHardToHearPractice'

vi.mock('../lib/shuffle', () => ({ shuffleArray: <T,>(items: T[]) => items }))
vi.mock('../lib/requeue', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/requeue')>()),
  randomRequeueGap: () => 2,
}))

const line = (id: string, text: string) => ({ id, text, seconds: 1, endSeconds: 2, createdAt: '2024-01-01T00:00:00.000Z' })
const lines = [line('a', 'Een.'), line('b', 'Twee.'), line('c', 'Drie.'), line('d', 'Vier.')]

describe('useHardToHearPractice', () => {
  it('an understood line moves on and counts as verstaan', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    act(() => result.current.next(true))

    expect(result.current.current?.id).toBe('b')
    expect(result.current.score).toEqual({ correct: 1, incorrect: 0 })
  })

  it('a line I did not understand comes back 2 lines later', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    act(() => result.current.next(false))

    expect(result.current.total).toBe(5)
    expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })
    act(() => result.current.next(true))
    act(() => result.current.next(true))
    expect(result.current.current?.id).toBe('a')
  })

  it('is done after the last line, and stop() ends the session', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start([lines[0]]))
    act(() => result.current.next(true))

    expect(result.current.done).toBe(true)
    act(() => result.current.next(true))
    expect(result.current.score).toEqual({ correct: 1, incorrect: 0 })

    act(() => result.current.stop())
    expect(result.current.active).toBe(false)
  })
})
