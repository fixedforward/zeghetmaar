import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor, fireEvent } from '@testing-library/react'
import { useTranscriptPlayer } from '../hooks/useTranscriptPlayer'
import { buildChatGptExplainUrl, buildChatGptListeningComprehensionUrl } from '../lib/chatgpt'

const lesson = {
  id: 'f1',
  name: 'Les 14',
  mediaFileId: 'v1',
  subtitleFileName: 'Les 14.srt',
  subtitleFileId: 's1',
  cues: [
    { start: 1, end: 2, text: 'Een.' },
    { start: 2, end: 4, text: 'Twee.' },
    { start: 6, end: 8, text: 'Drie.' },
  ],
}

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

function fakeMedia(currentTime = 0, paused = true) {
  const track = { mode: 'disabled', addCue: vi.fn() }
  return {
    currentTime, paused,
    play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(),
    addTextTrack: vi.fn(() => track), track,
  }
}

class FakeVTTCue {
  constructor(public startTime: number, public endTime: number, public text: string) {}
}

async function renderLoadedAsync() {
  global.fetch = vi.fn().mockResolvedValue(ok(lesson))
  const hook = renderHook(() => useTranscriptPlayer('f1', 'v1'))
  await waitFor(() => expect(hook.result.current.lesson).toEqual(lesson))
  return hook
}

describe('useTranscriptPlayer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('VTTCue', FakeVTTCue)
  })

  it('loads the lesson of the folder', async () => {
    const { result } = await renderLoadedAsync()

    expect(fetch).toHaveBeenCalledWith('/api/luisteren/lessons/f1?file=v1')
    expect(result.current.activeIndex).toBe(-1)
  })

  it('shows the API error when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Login om feature te gebruiken.' }) } as Response)

    const { result } = renderHook(() => useTranscriptPlayer('f1', 'v1'))

    await waitFor(() => expect(result.current.error).toBe('Login om feature te gebruiken.'))
    expect(result.current.lesson).toBeNull()
  })

  it('highlights the cue at the current playback time', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(5)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    act(() => result.current.syncActiveCue())

    expect(result.current.activeIndex).toBe(1)
  })

  it('jumps to a cue and plays from there', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia()
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    act(() => result.current.seekTo(6))

    expect(media.currentTime).toBe(6)
    expect(media.play).toHaveBeenCalled()
  })

  it('plays when paused and pauses when playing', async () => {
    const { result } = await renderLoadedAsync()
    const paused = fakeMedia(0, true)
    result.current.mediaRef.current = paused as unknown as HTMLVideoElement

    act(() => result.current.togglePlay())
    expect(paused.play).toHaveBeenCalled()

    const playing = fakeMedia(0, false)
    result.current.mediaRef.current = playing as unknown as HTMLVideoElement

    act(() => result.current.togglePlay())
    expect(playing.pause).toHaveBeenCalled()
    expect(playing.play).not.toHaveBeenCalled()
  })

  it('goes 5 s back with a and 5 s forward with d', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(20)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    fireEvent.keyDown(window, { key: 'a' })
    expect(media.currentTime).toBe(15)

    fireEvent.keyDown(window, { key: 'D' })
    fireEvent.keyDown(window, { key: 'd' })
    expect(media.currentTime).toBe(25)
  })

  it('goes 5 s back and forward with the arrow keys, without scrolling the page', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(20)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    const leftNotPrevented = fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(media.currentTime).toBe(15)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(media.currentTime).toBe(25)
    expect(leftNotPrevented).toBe(false)
  })

  it('plays and pauses with the space bar, once per press', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(0, true)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    const notPrevented = fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: ' ', repeat: true })

    expect(media.play).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it('leaves other keys alone', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(20)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    const notPrevented = fireEvent.keyDown(window, { key: 'ArrowDown' })

    expect(notPrevented).toBe(true)
    expect(media.currentTime).toBe(20)
  })

  it('ignores the keys while typing in a field or with a modifier like ⌘A', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(20)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement
    const input = document.createElement('input')
    document.body.appendChild(input)

    fireEvent.keyDown(input, { key: 'a' })
    fireEvent.keyDown(input, { key: ' ' })
    fireEvent.keyDown(window, { key: 'a', metaKey: true })
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })

    expect(media.currentTime).toBe(20)
    expect(media.play).not.toHaveBeenCalled()
    input.remove()
  })

  it('leaves the keys to an open modal, e.g. Space on its save button', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(20)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement
    const dialog = document.createElement('div')
    dialog.setAttribute('aria-modal', 'true')
    document.body.appendChild(dialog)

    const notPrevented = fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(notPrevented).toBe(true)
    expect(media.play).not.toHaveBeenCalled()
    expect(media.currentTime).toBe(20)
    dialog.remove()
  })

  it('pauses the video', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(0, false)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    act(() => result.current.pause())

    expect(media.pause).toHaveBeenCalled()
  })

  it('skips back and forward, never before the start', async () => {
    const { result } = await renderLoadedAsync()
    const media = fakeMedia(3)
    result.current.mediaRef.current = media as unknown as HTMLVideoElement

    act(() => result.current.skipBy(5))
    expect(media.currentTime).toBe(8)

    act(() => result.current.skipBy(-5))
    act(() => result.current.skipBy(-5))
    expect(media.currentTime).toBe(0)
  })

  it('gives up to 3 sentences around the selected cues as context', async () => {
    const { result } = await renderLoadedAsync()

    expect(result.current.contextAroundCues(1, 1)).toBe('Een. Twee. Drie.')
  })

  it('opens ChatGPT about the sentence of a line, with the sentences around it as context', async () => {
    const { result } = await renderLoadedAsync()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(window, 'focus').mockImplementation(() => {})

    act(() => result.current.explainCueInChatGpt(1))

    expect(openSpy.mock.calls[0][0]).toBe(buildChatGptExplainUrl('Twee.', 'Een. Twee. Drie.'))
  })

  it('opens a ChatGPT comprehension check with a link to the transcript', async () => {
    const { result } = await renderLoadedAsync()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(window, 'focus').mockImplementation(() => {})

    act(() => result.current.checkComprehensionInChatGpt())

    expect(openSpy.mock.calls[0][0]).toBe(buildChatGptListeningComprehensionUrl('Les 14', 's1'))
  })

  describe('subtitles on the video', () => {
    async function renderWithMediaAsync() {
      global.fetch = vi.fn().mockResolvedValue(ok(lesson))
      const media = fakeMedia()
      const hook = renderHook(() => useTranscriptPlayer('f1', 'v1'))
      hook.result.current.mediaRef.current = media as unknown as HTMLVideoElement
      await waitFor(() => expect(hook.result.current.lesson).toEqual(lesson))
      return { ...hook, media }
    }

    it('adds a Dutch subtitle track with every cue and shows it', async () => {
      const { media } = await renderWithMediaAsync()

      expect(media.addTextTrack).toHaveBeenCalledWith('subtitles', 'Nederlands', 'nl')
      expect(media.track.addCue.mock.calls.map(([cue]) => cue)).toEqual(lesson.cues.map(c => new FakeVTTCue(c.start, c.end, c.text)))
      expect(media.track.mode).toBe('showing')
    })

    it('hides and shows the subtitles', async () => {
      const { result, media } = await renderWithMediaAsync()

      act(() => result.current.toggleSubtitles())
      expect(result.current.subtitlesOn).toBe(false)
      expect(media.track.mode).toBe('hidden')

      act(() => result.current.toggleSubtitles())
      expect(media.track.mode).toBe('showing')
    })

    it('adds no track when the subtitles were not found', async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ ...lesson, subtitleFileId: null, cues: [] }))
      const media = fakeMedia()
      const { result } = renderHook(() => useTranscriptPlayer('f1', 'v1'))
      result.current.mediaRef.current = media as unknown as HTMLVideoElement

      await waitFor(() => expect(result.current.lesson?.subtitleFileId).toBeNull())

      expect(media.addTextTrack).not.toHaveBeenCalled()
    })

    it('disables the track on unmount, since a text track cannot be removed', async () => {
      const { unmount, media } = await renderWithMediaAsync()

      unmount()

      expect(media.track.mode).toBe('disabled')
    })
  })
})
