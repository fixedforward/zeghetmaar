import { useCallback, useRef } from 'react'
import { createWheelSwipeTracker, swipeDirection, type SwipeDirection } from '../lib/swipe'

const TAP_MAX_MOVE = 10

// Tap/click and left/right swipes (finger, mouse drag or two-finger trackpad) on one element.
export function useSwipeGestures(onTap: () => void, onSwipe: (direction: SwipeDirection) => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  // React's onWheel is passive, so preventDefault (which stops the browser's two-finger
  // back/forward navigation) needs a listener of our own.
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) return
    const trackWheelSwipe = createWheelSwipeTracker(onSwipe)
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      trackWheelSwipe(e.deltaX)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [onSwipe])

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const direction = swipeDirection(dx, dy)
    if (direction) onSwipe(direction)
    else if (Math.hypot(dx, dy) <= TAP_MAX_MOVE) onTap()
  }

  const onPointerCancel = () => {
    startRef.current = null
  }

  return { ref, onPointerDown, onPointerUp, onPointerCancel }
}
