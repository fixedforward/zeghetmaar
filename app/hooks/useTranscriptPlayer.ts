import { useCallback, useEffect, useRef, useState } from 'react'
import type { ListeningLesson } from '../types'
import { findActiveCueIndex, sentencesAroundCues } from '../lib/srt'
import { buildChatGptExplainUrl, openChatGptInBackground } from '../lib/chatgpt'
import { isModalOpen, isTypingTarget } from '../lib/keyboard'

const CONTEXT_SENTENCES = 3
export const SKIP_SECONDS = 5

export function useTranscriptPlayer(folderId: string, fileId: string) {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const subtitleTrackRef = useRef<TextTrack | null>(null)
  const [lesson, setLesson] = useState<ListeningLesson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [subtitlesOn, setSubtitlesOn] = useState(true)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLesson(null)
    setActiveIndex(-1)
    fetch(`/api/luisteren/lessons/${encodeURIComponent(folderId)}?file=${encodeURIComponent(fileId)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kon les niet laden.')
        if (!cancelled) setLesson(data)
      })
      .catch((err: Error) => {
        console.error('[useTranscriptPlayer]', err.message)
        if (!cancelled) setError(err.message)
      })
    return () => { cancelled = true }
  }, [folderId, fileId])

  // A track added with addTextTrack can't be removed, only disabled, so the cleanup disables it
  // (otherwise React's double effect run in dev shows every subtitle twice).
  useEffect(() => {
    const media = mediaRef.current
    if (!media || !lesson?.cues.length) return
    const track = media.addTextTrack('subtitles', 'Nederlands', 'nl')
    for (const cue of lesson.cues) track.addCue(new VTTCue(cue.start, cue.end, cue.text))
    subtitleTrackRef.current = track
    return () => {
      track.mode = 'disabled'
      subtitleTrackRef.current = null
    }
  }, [lesson])

  useEffect(() => {
    if (subtitleTrackRef.current) subtitleTrackRef.current.mode = subtitlesOn ? 'showing' : 'hidden'
  }, [lesson, subtitlesOn])

  const toggleSubtitles = useCallback(() => setSubtitlesOn(on => !on), [])

  const syncActiveCue = useCallback(() => {
    if (!lesson || !mediaRef.current) return
    setActiveIndex(findActiveCueIndex(lesson.cues, mediaRef.current.currentTime))
  }, [lesson])

  const seekTo = useCallback((seconds: number) => {
    const media = mediaRef.current
    if (!media) return
    media.currentTime = seconds
    media.play().catch((err: Error) => console.error('[useTranscriptPlayer]', err.message))
  }, [])

  const togglePlay = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    if (media.paused) media.play().catch((err: Error) => console.error('[useTranscriptPlayer]', err.message))
    else media.pause()
  }, [])

  const skipBy = useCallback((seconds: number) => {
    const media = mediaRef.current
    if (media) media.currentTime = Math.max(0, media.currentTime + seconds)
  }, [])

  // Space = play/pause, a or ← = 5 s back, d or → = 5 s forward; not while typing in a field,
  // using a shortcut like ⌘A, or with a modal (e.g. "Frase toevoegen") open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || isModalOpen()) return
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') skipBy(-SKIP_SECONDS)
      else if (key === 'd' || key === 'arrowright') skipBy(SKIP_SECONDS)
      else if (key === ' ') {
        if (!e.repeat) togglePlay()
      } else return
      // Otherwise Space also scrolls the page or clicks a focused button, and the native
      // controls of a focused video would handle Space and the arrows a second time.
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [skipBy, togglePlay])

  const contextAroundCues = useCallback((firstCue: number, lastCue: number) =>
    lesson ? sentencesAroundCues(lesson.cues, firstCue, lastCue, CONTEXT_SENTENCES) : undefined, [lesson])

  // Asks about the line's whole sentence(s), since a line often stops mid-sentence.
  const explainCueInChatGpt = useCallback((index: number) => {
    if (!lesson) return
    const sentence = sentencesAroundCues(lesson.cues, index, index, 0)
    openChatGptInBackground(buildChatGptExplainUrl(sentence, contextAroundCues(index, index)))
  }, [lesson, contextAroundCues])

  return {
    mediaRef, lesson, error, activeIndex, subtitlesOn,
    syncActiveCue, seekTo, togglePlay, skipBy, toggleSubtitles, contextAroundCues, explainCueInChatGpt,
  }
}
