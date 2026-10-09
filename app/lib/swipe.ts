export type SwipeDirection = -1 | 1
export type TapZone = 'left' | 'middle' | 'right'

const SWIPE_MIN_DISTANCE = 40
const WHEEL_SWIPE_MIN_DISTANCE = 60
const WHEEL_SWIPE_IDLE_MS = 300

// Which third of the element a tap landed in; `fraction` is 0 at the left edge, 1 at the right.
export function tapZone(fraction: number): TapZone {
  if (fraction < 1 / 3) return 'left'
  if (fraction > 2 / 3) return 'right'
  return 'middle'
}

// -1 for a swipe to the left, 1 to the right, 0 for a tap or a mostly vertical move.
export function swipeDirection(dx: number, dy: number): SwipeDirection | 0 {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? -1 : 1
}

// A two-finger trackpad swipe arrives as a burst of wheel events (plus momentum after the
// fingers lift), so it counts once per burst; a short pause ends the burst. With macOS
// natural scrolling, fingers moving left give a positive deltaX.
export function createWheelSwipeTracker(onSwipe: (direction: SwipeDirection) => void) {
  let total = 0
  let fired = false
  let idleTimer: ReturnType<typeof setTimeout> | undefined

  return (deltaX: number) => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      total = 0
      fired = false
    }, WHEEL_SWIPE_IDLE_MS)
    if (fired) return
    total += deltaX
    if (Math.abs(total) < WHEEL_SWIPE_MIN_DISTANCE) return
    fired = true
    onSwipe(total > 0 ? -1 : 1)
  }
}
