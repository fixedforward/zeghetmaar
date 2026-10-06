export interface PopupRect {
  width: number
  height: number
  left: number
  top: number
}

export function openPopupWindow(url: string, name: string, rect: PopupRect): void {
  window.open(
    url,
    name,
    `popup=yes,noopener,noreferrer,width=${rect.width},height=${rect.height},left=${rect.left},top=${rect.top}`
  )
}

// Half of the screen, on the side the current window is not mostly on, so the
// two end up side by side. availLeft/availTop are non-standard but give the
// current monitor's offset in Chrome and Firefox.
export function oppositeHalfOfScreen(): PopupRect {
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number }
  const screenLeft = screen.availLeft ?? 0
  const screenTop = screen.availTop ?? 0
  const width = Math.floor(screen.availWidth / 2)
  const windowCenter = (window.screenLeft ?? window.screenX ?? 0) + (window.outerWidth ?? 0) / 2
  const currentOnRight = windowCenter > screenLeft + width
  return {
    width,
    height: screen.availHeight,
    left: currentOnRight ? screenLeft : screenLeft + width,
    top: screenTop,
  }
}
