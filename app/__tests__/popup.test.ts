import { describe, it, expect, vi, afterEach } from 'vitest'
import { oppositeHalfOfScreen, openPopupWindow } from '../lib/popup'

const stubScreen = (screen: Partial<Screen> & { availLeft?: number; availTop?: number }) =>
  vi.stubGlobal('screen', { availWidth: 2000, availHeight: 1200, availLeft: 0, availTop: 25, ...screen })

describe('oppositeHalfOfScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the left half when the current window is on the right', () => {
    stubScreen({})
    vi.stubGlobal('screenLeft', 1000)
    vi.stubGlobal('outerWidth', 1000)

    expect(oppositeHalfOfScreen()).toEqual({ width: 1000, height: 1200, left: 0, top: 25 })
  })

  it('uses the right half when the current window is on the left', () => {
    stubScreen({})
    vi.stubGlobal('screenLeft', 0)
    vi.stubGlobal('outerWidth', 1000)

    expect(oppositeHalfOfScreen()).toEqual({ width: 1000, height: 1200, left: 1000, top: 25 })
  })

  it('offsets by the monitor position on a second screen', () => {
    stubScreen({ availLeft: 2000 })
    vi.stubGlobal('screenLeft', 2000)
    vi.stubGlobal('outerWidth', 800)

    expect(oppositeHalfOfScreen()).toEqual({ width: 1000, height: 1200, left: 3000, top: 25 })
  })
})

describe('openPopupWindow', () => {
  afterEach(() => vi.restoreAllMocks())

  it('opens the url as a sized and positioned popup', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)

    openPopupWindow('https://youtu.be/a', 'luisteren-video', { width: 1000, height: 1200, left: 0, top: 25 })

    expect(openSpy).toHaveBeenCalledWith(
      'https://youtu.be/a',
      'luisteren-video',
      'popup=yes,noopener,noreferrer,width=1000,height=1200,left=0,top=25'
    )
  })
})
