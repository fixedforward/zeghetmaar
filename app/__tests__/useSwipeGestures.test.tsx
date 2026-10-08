import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSwipeGestures } from '../hooks/useSwipeGestures'

function Surface({ onTap, onSwipe }: { onTap: () => void; onSwipe: (direction: -1 | 1) => void }) {
  const gestures = useSwipeGestures(onTap, onSwipe)
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
  const onTap = vi.fn()
  const onSwipe = vi.fn()
  render(<Surface onTap={onTap} onSwipe={onSwipe} />)
  return { onTap, onSwipe, surface: screen.getByTestId('surface') }
}

describe('useSwipeGestures', () => {
  it('treats a click or tap without moving as a tap', () => {
    const { onTap, onSwipe, surface } = renderSurface()

    fireEvent.pointerDown(surface, { clientX: 100, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 103, clientY: 51 })

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('reports a finger swipe to the left or right', () => {
    const { onTap, onSwipe, surface } = renderSurface()

    fireEvent.pointerDown(surface, { clientX: 200, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 60 })
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 50 })
    fireEvent.pointerUp(surface, { clientX: 200, clientY: 50 })

    expect(onSwipe.mock.calls).toEqual([[-1], [1]])
    expect(onTap).not.toHaveBeenCalled()
  })

  it('does nothing when the browser cancels the pointer, e.g. to scroll the page', () => {
    const { onTap, onSwipe, surface } = renderSurface()

    fireEvent.pointerDown(surface, { clientX: 100, clientY: 50 })
    fireEvent.pointerCancel(surface)
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 50 })

    expect(onTap).not.toHaveBeenCalled()
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
