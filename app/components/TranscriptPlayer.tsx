'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SKIP_SECONDS, useTranscriptPlayer } from '../hooks/useTranscriptPlayer'
import { useChatGptSelection } from '../hooks/useChatGptSelection'
import { useWords } from '../hooks/useWords'
import { useAddPhraseModal } from '../hooks/useAddPhraseModal'
import { useSwipeGestures } from '../hooks/useSwipeGestures'
import { ChatGptSelectionLink } from './ChatGptSelectionLink'
import { AddPhraseModal } from './AddPhraseModal'
import { DEFAULT_MODEL } from '../config/models'
import { formatClock } from '../lib/youtube'
import type { SwipeDirection } from '../lib/swipe'

function cueIndexOf(node: Node | null): number {
  const element = node instanceof Element ? node : node?.parentElement
  const index = element?.closest('[data-cue-index]')?.getAttribute('data-cue-index')
  return index == null ? -1 : Number(index)
}

const toggleClass = (active: boolean) =>
  `px-3 py-1 rounded border text-sm ${active ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`

export function TranscriptPlayer({ folderId, fileId }: { folderId: string; fileId: string }) {
  const player = useTranscriptPlayer(folderId, fileId)
  const { chatGptLink, handleTextSelection, closeChatGptLink } = useChatGptSelection((selection: Selection) => {
    const anchorCue = cueIndexOf(selection.anchorNode)
    const focusCue = cueIndexOf(selection.focusNode)
    if (anchorCue < 0 || focusCue < 0) return undefined
    return player.contextAroundCues(Math.min(anchorCue, focusCue), Math.max(anchorCue, focusCue))
  })
  // This page has no model picker, so AI help in the add form uses the default model.
  const words = useWords(DEFAULT_MODEL)
  const addPhrase = useAddPhraseModal(words)
  const { skipBy } = player
  const skipBySwipe = useCallback((direction: SwipeDirection) => skipBy(direction * SKIP_SECONDS), [skipBy])
  const gestures = useSwipeGestures(player.togglePlay, skipBySwipe)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const activeCueRef = useRef<HTMLDivElement>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  // Scroll only the transcript list, not the whole page, so the video stays in view.
  useEffect(() => {
    const container = transcriptRef.current
    const cue = activeCueRef.current
    if (!container || !cue) return
    container.scrollTo({ top: cue.offsetTop - container.clientHeight / 2 + cue.clientHeight / 2, behavior: 'smooth' })
  }, [player.activeIndex])

  if (player.error) return <p className="text-sm text-red-500">{player.error}</p>
  if (!player.lesson) return <p className="text-sm text-gray-400">Laden...</p>

  // A drag to select text also fires a click; only a plain click should jump.
  const jumpToCue = (start: number) => {
    if (window.getSelection()?.toString()) return
    player.seekTo(start)
  }

  const { lesson } = player
  const subtitlesFound = lesson.subtitleFileId !== null
  const currentCue = lesson.cues[player.activeIndex]

  // Pauses first, so the video doesn't run on while you fill in the form.
  const addCurrentCueToFraselijst = () => {
    if (!currentCue) return
    player.pause()
    addPhrase.openWith(currentCue.text)
  }
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3 space-y-3">
        <h1 className="text-lg font-semibold text-gray-800">{lesson.name}</h1>
        <div className="relative">
          <video
            ref={player.mediaRef}
            src={`/api/luisteren/media/${encodeURIComponent(lesson.mediaFileId)}`}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={player.syncActiveCue}
            className={`w-full rounded bg-black ${lesson.isAudio ? 'aspect-video' : 'max-h-[70vh]'}`}
          />
          {/* Catches clicks and swipes on the picture; subtitles are shown below the controls. */}
          <div
            ref={gestures.ref}
            onPointerDown={gestures.onPointerDown}
            onPointerUp={gestures.onPointerUp}
            onPointerCancel={gestures.onPointerCancel}
            className="absolute inset-x-0 top-0 bottom-16 cursor-pointer touch-pan-y"
          />
        </div>
        {subtitlesFound && (
          <div className="rounded border border-gray-200 bg-gray-50 p-3" onMouseUp={handleTextSelection}>
            <p className="min-h-6 text-gray-800" aria-live="polite">
              <span data-cue-index={player.activeIndex}>{currentCue?.text ?? '—'}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => currentCue && player.explainCueInChatGpt(player.activeIndex)} disabled={!currentCue} className="px-3 py-1 text-sm border rounded text-blue-600 disabled:opacity-50">
                Vraag ChatGPT
              </button>
              <button type="button" onClick={addCurrentCueToFraselijst} disabled={!currentCue} className="px-3 py-1 text-sm border rounded disabled:opacity-50">
                + Fraselijst
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => player.skipBy(-SKIP_SECONDS)} title="5 seconden terug" className={toggleClass(false)}>
            −{SKIP_SECONDS}s
          </button>
          <button onClick={() => player.skipBy(SKIP_SECONDS)} title="5 seconden vooruit" className={toggleClass(false)}>
            +{SKIP_SECONDS}s
          </button>
          {subtitlesFound && <button
            type="button"
            onClick={() => setTranscriptOpen(open => !open)}
            aria-expanded={transcriptOpen}
            className={toggleClass(transcriptOpen)}
          >
            Volledige ondertiteling {transcriptOpen ? 'verbergen' : 'tonen'}
          </button>}
          <button
            type="button"
            onClick={() => setHelpOpen(open => !open)}
            title="Hulp"
            aria-expanded={helpOpen}
            className={`w-8 h-8 rounded-full border text-sm font-semibold ${helpOpen ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            ?
          </button>
        </div>
        {subtitlesFound && (
          <button
            type="button"
            onClick={player.checkComprehensionInChatGpt}
            className="px-3 py-1.5 text-sm border rounded text-blue-600 hover:bg-gray-50"
          >
            Comprehension controleren
          </button>
        )}
        {helpOpen && (
          <p className="text-xs text-gray-500 p-2 rounded border border-gray-200 bg-gray-50">
            Klik op de video of druk op spatie om te starten/stoppen. Swipe naar links/rechts of druk op ←/→ of a/d voor 5 s terug/vooruit.
            {subtitlesFound && ' "+ Fraselijst" zet de huidige ondertitel in de Fraselijst (de video pauzeert even). Klik op "Uitleg" naast een zin, of selecteer tekst in het transcript om het in ChatGPT uit te laten leggen of aan de Fraselijst toe te voegen.'}
          </p>
        )}
      </div>
      {!subtitlesFound && (
        <div className="lg:w-1/3 self-start p-3 rounded border border-orange-200 bg-orange-50 text-sm text-orange-800">
          <p className="font-medium">Ondertitels niet gevonden.</p>
          <p className="mt-1">
            Zorg dat er een .srt-bestand bestaat met dezelfde naam als de video, in dezelfde map:{' '}
            <code className="break-all">{lesson.subtitleFileName}</code>
          </p>
        </div>
      )}
      <div ref={transcriptRef} hidden={!subtitlesFound || !transcriptOpen} onMouseUp={handleTextSelection} className="relative lg:w-1/3 h-[75vh] overflow-y-auto pr-2">
        {lesson.cues.map((cue, i) => (
          <div
            key={i}
            data-cue-index={i}
            ref={i === player.activeIndex ? activeCueRef : undefined}
            onClick={() => jumpToCue(cue.start)}
            className={`group flex gap-3 rounded px-2 py-1 cursor-pointer ${i === player.activeIndex ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}
          >
            <span className="shrink-0 w-14 pt-0.5 font-mono text-xs text-gray-400 select-none">{formatClock(Math.floor(cue.start))}</span>
            <span className="flex-1 text-gray-800">{cue.text}</span>
            <button
              onClick={e => { e.stopPropagation(); player.explainCueInChatGpt(i) }}
              title="Leg deze zin uit in ChatGPT"
              className={`shrink-0 self-start pt-0.5 text-xs text-green-600 hover:underline select-none ${
                i === player.activeIndex ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
            >
              Uitleg
            </button>
          </div>
        ))}
      </div>
      <ChatGptSelectionLink link={chatGptLink} onClose={closeChatGptLink} onAddPhrase={addPhrase.openWith} />
      <AddPhraseModal words={words} open={addPhrase.open} onClose={addPhrase.close} />
    </div>
  )
}
