import { useCallback, useRef } from 'react'
import { createWheelSwipeTracker, swipeDirection, tapZone, type SwipeDirection, type TapZone } from '../lib/swipe'

const TAP_MAX_MOVE = 10
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_MAX_DISTANCE = 40

// Double-tap/double-click (reported with the third it landed in) and left/right swipes
// (finger, mouse drag or two-finger trackpad) on one element. A single tap does nothing.
export function useSwipeGestures(onDoubleTap: (zone: TapZone) => void, onSwipe: (direction: SwipeDirection) => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)

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

  const onTap = (e: React.PointerEvent<HTMLElement>) => {
    const now = Date.now()
    const last = lastTapRef.current
    const isSecondTap = !!last && now - last.time <= DOUBLE_TAP_MS
      && Math.hypot(e.clientX - last.x, e.clientY - last.y) <= DOUBLE_TAP_MAX_DISTANCE
    if (!isSecondTap) {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
      return
    }
    lastTapRef.current = null
    const rect = e.currentTarget.getBoundingClientRect()
    onDoubleTap(tapZone((e.clientX - rect.left) / rect.width))
  }

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
    else if (Math.hypot(dx, dy) <= TAP_MAX_MOVE) onTap(e)
  }

  const onPointerCancel = () => {
    startRef.current = null
  }

  return { ref, onPointerDown, onPointerUp, onPointerCancel }
}
