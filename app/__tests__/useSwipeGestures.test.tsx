import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSwipeGestures } from '../hooks/useSwipeGestures'
import type { TapZone } from '../lib/swipe'

function Surface({ onDoubleTap, onSwipe }: { onDoubleTap: (zone: TapZone) => void; onSwipe: (direction: -1 | 1) => void }) {
  const gestures = useSwipeGestures(onDoubleTap, onSwipe)
  return (
    <div
      data-testid="surface"
      ref={gestures.ref}
      onPointerDown={gestures.onPointerDown}
      onPointerUp={gestures.onPointerUp}
      onPointerCancel={gestures.onPointerCancel}
    />
  )
}

function renderSurface() {
  const onDoubleTap = vi.fn()
  const onSwipe = vi.fn()
  render(<Surface onDoubleTap={onDoubleTap} onSwipe={onSwipe} />)
  const surface = screen.getByTestId('surface')
  // jsdom has no layout, so give the surface a 300 px wide box.
  surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200, x: 0, y: 0, toJSON: () => ({}) })
  return { onDoubleTap, onSwipe, surface }
}

function tap(surface: HTMLElement, clientX: number, clientY = 50) {
  fireEvent.pointerDown(surface, { clientX, clientY })
  fireEvent.pointerUp(surface, { clientX: clientX + 2, clientY })
}

describe('useSwipeGestures', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ignores a single tap', () => {
    const { onDoubleTap, onSwipe, surface } = renderSurface()

    tap(surface, 150)

    expect(onDoubleTap).not.toHaveBeenCalled()
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('reports a double-tap with the third it landed in', () => {
    const { onDoubleTap, surface } = renderSurface()

    tap(surface, 40); tap(surface, 42)
    tap(surface, 150); tap(surface, 151)
    tap(surface, 260); tap(surface, 258)

    expect(onDoubleTap.mock.calls).toEqual([['left'], ['middle'], ['right']])
  })

  it('does not count two taps that are too far apart in time or place', () => {
    const now = vi.spyOn(Date, 'now')
    const { onDoubleTap, surface } = renderSurface()

    now.mockReturnValue(1000); tap(surface, 150)
    now.mockReturnValue(1400); tap(surface, 150)
    now.mockReturnValue(5000); tap(surface, 40)
    now.mockReturnValue(5100); tap(surface, 260)

    expect(onDoubleTap).not.toHaveBeenCalled()
  })

  it('reports a finger swipe to the left or right', () => {
    const { onDoubleTap, onSwipe, surface } = renderSurface()

    fireEvent.pointerDown(surface, { clientX: 200, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 60 })
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 200, clientY: 50 })

    expect(onSwipe.mock.calls).toEqual([[-1], [1]])
    expect(onDoubleTap).not.toHaveBeenCalled()
  })

  it('does nothing when the browser cancels the pointer, e.g. to scroll the page', () => {
    const { onDoubleTap, onSwipe, surface } = renderSurface()

    tap(surface, 150)
    fireEvent.pointerDown(surface, { clientX: 150, clientY: 50 })
    fireEvent.pointerCancel(surface)
    fireEvent.pointerUp(surface, { clientX: 150, clientY: 50 })

    expect(onDoubleTap).not.toHaveBeenCalled()
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('turns a two-finger trackpad swipe into a swipe and stops the browser from navigating', () => {
    const { onSwipe, surface } = renderSurface()

    const notPrevented = fireEvent.wheel(surface, { deltaX: 80, deltaY: 2 })

    expect(notPrevented).toBe(false)
    expect(onSwipe).toHaveBeenCalledWith(-1)
  })

  it('leaves vertical scrolling alone', () => {
    const { onSwipe, surface } = renderSurface()

    const notPrevented = fireEvent.wheel(surface, { deltaX: 5, deltaY: 80 })

    expect(notPrevented).toBe(true)
    expect(onSwipe).not.toHaveBeenCalled()
  })
})
