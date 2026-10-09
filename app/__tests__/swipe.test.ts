import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { swipeDirection, createWheelSwipeTracker, tapZone } from '../lib/swipe'

describe('tapZone', () => {
  it('splits the element into a left, middle and right third', () => {
    expect(tapZone(0.1)).toBe('left')
    expect(tapZone(0.5)).toBe('middle')
    expect(tapZone(0.9)).toBe('right')
  })
})

describe('swipeDirection', () => {
  it('reads a long horizontal move as a swipe left or right', () => {
    expect(swipeDirection(-80, 10)).toBe(-1)
    expect(swipeDirection(80, -10)).toBe(1)
  })

  it('ignores a short move and a mostly vertical one', () => {
    expect(swipeDirection(20, 0)).toBe(0)
    expect(swipeDirection(60, 90)).toBe(0)
  })
})

describe('createWheelSwipeTracker', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts one burst of wheel events as one swipe, fingers left (positive deltaX) being back', () => {
    const onSwipe = vi.fn()
    const track = createWheelSwipeTracker(onSwipe)

    for (let i = 0; i < 10; i++) track(15)

    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenCalledWith(-1)
  })

  it('swipes forward for fingers moving right (negative deltaX)', () => {
    const onSwipe = vi.fn()
    const track = createWheelSwipeTracker(onSwipe)

    track(-70)

    expect(onSwipe).toHaveBeenCalledWith(1)
  })

  it('ignores a tiny horizontal scroll', () => {
    const onSwipe = vi.fn()
    const track = createWheelSwipeTracker(onSwipe)

    track(20)
    track(20)

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('counts a new swipe after a short pause', () => {
    const onSwipe = vi.fn()
    const track = createWheelSwipeTracker(onSwipe)

    track(70)
    vi.advanceTimersByTime(100)
    track(70)
    expect(onSwipe).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(300)
    track(70)
    expect(onSwipe).toHaveBeenCalledTimes(2)
  })
})
