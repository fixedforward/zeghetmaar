import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePracticeTracker } from '../hooks/usePracticeTracker'
import { todayLocalIso } from '../lib/date'

describe('usePracticeTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads practiced dates when logged in', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dates: ['2026-09-18', '2026-09-19'] }),
    } as Response)

    const { result } = renderHook(() => usePracticeTracker('quiz', true))

    await act(async () => {
      result.current.loadPracticeLog()
    })

    expect(fetch).toHaveBeenCalledWith('/api/practice-log/quiz')
    expect(result.current.practicedDates).toEqual(new Set(['2026-09-18', '2026-09-19']))
  })

  it('does nothing when not logged in', () => {
    global.fetch = vi.fn()
    const { result } = renderHook(() => usePracticeTracker('oefensessie', false))

    act(() => { result.current.loadPracticeLog() })
    act(() => { result.current.markPracticedToday() })

    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.practicedDates.size).toBe(0)
  })

  it('marks today as practiced, optimistically and via POST, only once per session', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    const { result } = renderHook(() => usePracticeTracker('oefensessie', true))

    act(() => { result.current.markPracticedToday() })

    expect(result.current.practicedDates.size).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/practice-log/oefensessie', expect.objectContaining({ method: 'POST' }))

    act(() => { result.current.markPracticedToday() })
    // Second call this session is a no-op — already marked, no duplicate POST.
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not re-POST when today was already loaded from the server (manual check-in on an already-marked day)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dates: [todayLocalIso()] }),
    } as Response)

    const { result } = renderHook(() => usePracticeTracker('quiz', true))

    await act(async () => { result.current.loadPracticeLog() })
    expect(fetch).toHaveBeenCalledTimes(1)

    act(() => { result.current.markPracticedToday() })
    // Already marked from the load — the manual check-in button is a no-op.
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('cancels a manual check-in, optimistically and via DELETE', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    const { result } = renderHook(() => usePracticeTracker('oefensessie', true))

    act(() => { result.current.markPracticedToday() })
    expect(result.current.practicedDates.size).toBe(1)

    act(() => { result.current.cancelPracticedToday() })

    expect(result.current.practicedDates.size).toBe(0)
    expect(fetch).toHaveBeenLastCalledWith('/api/practice-log/oefensessie', expect.objectContaining({ method: 'DELETE' }))
  })

  it('allows re-marking today after canceling', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    const { result } = renderHook(() => usePracticeTracker('quiz', true))

    act(() => { result.current.markPracticedToday() })
    act(() => { result.current.cancelPracticedToday() })
    act(() => { result.current.markPracticedToday() })

    expect(result.current.practicedDates.size).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(3) // POST, DELETE, POST again
  })

  it('does nothing when canceling a day that was never marked', () => {
    global.fetch = vi.fn()
    const { result } = renderHook(() => usePracticeTracker('quiz', true))

    act(() => { result.current.cancelPracticedToday() })

    expect(fetch).not.toHaveBeenCalled()
  })

  it('marks the new day too if the tab stays open across midnight (regression: a bare "already marked this session" flag would wrongly block this)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T23:00:00'))
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    const { result } = renderHook(() => usePracticeTracker('quiz', true))

    act(() => { result.current.markPracticedToday() })
    expect(result.current.practicedDates.has('2026-09-19')).toBe(true)

    vi.setSystemTime(new Date('2026-09-20T00:30:00'))
    act(() => { result.current.markPracticedToday() })

    expect(result.current.practicedDates.has('2026-09-20')).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('keeps oefensessie and quiz trackers independent', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    const oefensessie = renderHook(() => usePracticeTracker('oefensessie', true))
    const quiz = renderHook(() => usePracticeTracker('quiz', true))

    act(() => { oefensessie.result.current.markPracticedToday() })

    expect(oefensessie.result.current.practicedDates.size).toBe(1)
    expect(quiz.result.current.practicedDates.size).toBe(0)
    expect(fetch).toHaveBeenCalledWith('/api/practice-log/oefensessie', expect.objectContaining({ method: 'POST' }))
  })
})
