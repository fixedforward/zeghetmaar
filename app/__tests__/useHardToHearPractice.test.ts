import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { practiceSize, useHardToHearPractice } from '../hooks/useHardToHearPractice'

vi.mock('../lib/shuffle', () => ({ shuffleArray: <T,>(items: T[]) => items }))

const line = (id: string, text: string) => ({ id, text, seconds: 1, endSeconds: 2, createdAt: '2024-01-01T00:00:00.000Z' })
const lines = [line('a', 'Een.'), line('b', 'Twee.'), line('c', 'Drie.')]

describe('useHardToHearPractice', () => {
  it('goes to the next and previous fragment', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.current?.id).toBe('c')

    act(() => result.current.previous())
    expect(result.current.current?.id).toBe('b')
  })

  it('stays on the first and last fragment', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    expect(result.current.hasPrevious).toBe(false)
    act(() => result.current.previous())
    expect(result.current.index).toBe(0)

    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.hasNext).toBe(false)
    act(() => result.current.next())
    expect(result.current.current?.id).toBe('c')
  })

  it('stop() ends the session', () => {
    const { result } = renderHook(() => useHardToHearPractice())
    act(() => result.current.start(lines))

    act(() => result.current.stop())

    expect(result.current.active).toBe(false)
  })

  it('practices only the first 10 of the shuffled lines', () => {
    const many = Array.from({ length: 12 }, (_, i) => line(`l${i}`, `Zin ${i}.`))
    const { result } = renderHook(() => useHardToHearPractice())

    act(() => result.current.start(many))

    expect(result.current.total).toBe(10)
    expect(result.current.current?.id).toBe('l0')
  })
})

describe('practiceSize', () => {
  it('is 10 at most, or all lines when there are fewer', () => {
    expect(practiceSize(3)).toBe(3)
    expect(practiceSize(10)).toBe(10)
    expect(practiceSize(23)).toBe(10)
  })
})
