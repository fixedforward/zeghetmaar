import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIslandPractice, PRACTICE_SIZE, PRACTICE_SIZE_STORAGE_KEY, SECONDS_PER_CARD } from '../hooks/useIslandPractice'
import type { LanguageIsland } from '../types'

vi.mock('../lib/requeue', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/requeue')>()),
  randomRequeueGap: () => 2,
}))

const island = (n: number, options = ['optie']): LanguageIsland =>
  ({ id: `i${n}`, english: `Phrase ${n}`, options, createdAt: '2026-01-01T00:00:00.000Z' })

const islands = Array.from({ length: 12 }, (_, i) => island(i + 1))

function answer(result: { current: ReturnType<typeof useIslandPractice> }, correct: boolean) {
  act(() => { result.current.reveal() })
  act(() => { result.current.markAndNext(correct) })
}

describe('useIslandPractice', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with random islands that have options', () => {
    const { result } = renderHook(() => useIslandPractice())

    act(() => { result.current.start([...islands, island(99, [])]) })

    expect(result.current.active).toBe(true)
    expect(result.current.current?.options.length).toBeGreaterThan(0)
    expect(result.current.secondsLeft).toBe(SECONDS_PER_CARD)
  })

  it('does not start when no island has options', () => {
    const { result } = renderHook(() => useIslandPractice())

    act(() => { result.current.start([island(1, [])]) })

    expect(result.current.active).toBe(false)
  })

  it('reveals the answer when the time is up', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.start(islands) })

    act(() => { vi.advanceTimersByTime((SECONDS_PER_CARD - 1) * 1000) })
    expect(result.current.revealed).toBe(false)
    expect(result.current.secondsLeft).toBe(1)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.revealed).toBe(true)
  })

  it('only marks a card after the answer is shown', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.start(islands) })
    const first = result.current.current

    act(() => { result.current.markAndNext(true) })

    expect(result.current.current).toBe(first)
    expect(result.current.total).toBe(0)
  })

  it('finishes after every card is correct with score and time', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.start(islands) })

    for (let i = 0; i < PRACTICE_SIZE; i++) {
      act(() => { vi.advanceTimersByTime(2000) })
      answer(result, true)
    }

    expect(result.current.finished).toBe(true)
    expect(result.current.current).toBeNull()
    expect(result.current.score).toBe(PRACTICE_SIZE)
    expect(result.current.total).toBe(PRACTICE_SIZE)
    expect(result.current.totalSeconds).toBe(PRACTICE_SIZE * 2)
  })

  it('brings a wrong card back later and counts only the first answer', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.start(islands) })
    const wrong = result.current.current!

    answer(result, false)
    const seen = [result.current.current!.id]
    answer(result, true)
    seen.push(result.current.current!.id)
    answer(result, true)

    expect(seen).not.toContain(wrong.id)
    expect(result.current.current?.id).toBe(wrong.id)

    for (let i = 0; i < PRACTICE_SIZE - 2; i++) answer(result, true)

    expect(result.current.finished).toBe(true)
    expect(result.current.score).toBe(PRACTICE_SIZE - 1)
    expect(result.current.total).toBe(PRACTICE_SIZE)
  })

  it('counts a marked card as practice, but not a card that is only shown', () => {
    const onPractice = vi.fn()
    const { result } = renderHook(() => useIslandPractice(onPractice))
    act(() => { result.current.start(islands) })

    act(() => { result.current.reveal() })
    expect(onPractice).not.toHaveBeenCalled()

    act(() => { result.current.markAndNext(false) })
    expect(onPractice).toHaveBeenCalledTimes(1)
  })

  it('practices the chosen number of islands, or all of them', () => {
    const { result } = renderHook(() => useIslandPractice())

    act(() => { result.current.setSize(5) })
    act(() => { result.current.start(islands) })
    expect(result.current.queueLength).toBe(5)

    act(() => { result.current.setSize(Infinity) })
    act(() => { result.current.start(islands) })
    expect(result.current.queueLength).toBe(islands.length)
  })

  it('remembers the chosen number on this device', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.setSize(20) })
    expect(localStorage.getItem(PRACTICE_SIZE_STORAGE_KEY)).toBe('20')

    const { result: later } = renderHook(() => useIslandPractice())
    expect(later.current.size).toBe(20)
  })

  it('ignores a stored number that is not an option', () => {
    localStorage.setItem(PRACTICE_SIZE_STORAGE_KEY, '7')
    const { result } = renderHook(() => useIslandPractice())
    expect(result.current.size).toBe(PRACTICE_SIZE)
  })

  it('stop goes back to the list', () => {
    const { result } = renderHook(() => useIslandPractice())
    act(() => { result.current.start(islands) })

    act(() => { result.current.stop() })

    expect(result.current.active).toBe(false)
    expect(result.current.current).toBeNull()
  })
})
