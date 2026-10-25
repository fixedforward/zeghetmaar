'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { JUMP_INTERVAL_SECONDS, SEGMENT_PADDING_SECONDS, SKIP_SECONDS, useTranscriptPlayer } from '../hooks/useTranscriptPlayer'
import { useChatGptSelection } from '../hooks/useChatGptSelection'
import { useWords } from '../hooks/useWords'
import { useAddPhraseModal } from '../hooks/useAddPhraseModal'
import { useSwipeGestures } from '../hooks/useSwipeGestures'
import { useVideoSize } from '../hooks/useVideoSize'
import { useHardToHearPhrases } from '../hooks/useHardToHearPhrases'
import { useHardToHearPractice } from '../hooks/useHardToHearPractice'
import { ChatGptSelectionLink } from './ChatGptSelectionLink'
import { AddPhraseModal } from './AddPhraseModal'
import { HardToHearPractice } from './HardToHearPractice'
import { DEFAULT_MODEL } from '../config/models'
import { formatClock, intervalStarts } from '../lib/youtube'
import { VIDEO_SIZES, type VideoSize } from '../lib/videoSize'
import type { SwipeDirection, TapZone } from '../lib/swipe'
import type { HardToHearPhrase } from '../types'

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
  const hardToHear = useHardToHearPhrases(player.lesson?.name ?? null)
  const practice = useHardToHearPractice()
  const { skipBy, togglePlay } = player
  const skipBySwipe = useCallback((direction: SwipeDirection) => skipBy(direction * SKIP_SECONDS), [skipBy])
  // Double-tap: left third 5 s back, middle play/pause, right third 5 s forward.
  const onDoubleTap = useCallback((zone: TapZone) => {
    if (zone === 'middle') togglePlay()
    else skipBy(zone === 'left' ? -SKIP_SECONDS : SKIP_SECONDS)
  }, [skipBy, togglePlay])
  const gestures = useSwipeGestures(onDoubleTap, skipBySwipe)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const activeCueRef = useRef<HTMLDivElement>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const { size, setSize } = useVideoSize()
  const sizeClasses = VIDEO_SIZES[size]

  // Keeps the current line at the top of the transcript list, also right after opening it.
  // Scrolls only the list, not the whole page, so the video stays in view.
  useEffect(() => {
    const container = transcriptRef.current
    const cue = activeCueRef.current
    if (!container || !cue || !transcriptOpen) return
    container.scrollTo({ top: cue.offsetTop, behavior: 'smooth' })
  }, [player.activeIndex, transcriptOpen])

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
  const jumpStarts = intervalStarts(player.duration, JUMP_INTERVAL_SECONDS)

  // Pauses first, so the video doesn't run on while you fill in the form.
  const addCurrentCueToFraselijst = () => {
    if (!currentCue) return
    player.pause()
    addPhrase.openWith(currentCue.text)
  }

  const currentCueSaved = !!currentCue && hardToHear.phrases.some(p => p.text === currentCue.text && p.seconds === currentCue.start)
  // Lines saved before the end time was stored only have a start to jump to.
  const playHardToHear = (phrase: HardToHearPhrase) => phrase.endSeconds === undefined
    ? player.seekTo(phrase.seconds)
    : player.playSegment(phrase.seconds, phrase.endSeconds)
  const addCurrentCueToHardToHear = () => {
    if (currentCue) hardToHear.addPhraseAsync(currentCue.text, currentCue.start, currentCue.end)
  }
  return (
    <div className={`flex flex-col gap-6 ${sizeClasses.layout}`}>
      <div className={`${sizeClasses.column} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-gray-800">{lesson.name}</h1>
          <div role="group" aria-label="Videogrootte" className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Grootte:</span>
            {(Object.keys(VIDEO_SIZES) as VideoSize[]).map(key => (
              <button key={key} type="button" onClick={() => setSize(key)} aria-pressed={size === key} className={toggleClass(size === key)}>
                {VIDEO_SIZES[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <video
            ref={player.mediaRef}
            src={`/api/luisteren/media/${encodeURIComponent(lesson.mediaFileId)}`}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={player.syncActiveCue}
            onLoadedMetadata={player.syncDuration}
            onDurationChange={player.syncDuration}
            className={`w-full rounded bg-black ${lesson.isAudio ? 'aspect-video' : sizeClasses.maxHeight}`}
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
          // Touching the subtitle pauses, so the line stays put while you read, select or use a button.
          <div className="rounded border border-gray-200 bg-gray-50 p-3" onPointerDown={player.pause} onMouseUp={handleTextSelection}>
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
              <button
                type="button"
                onClick={addCurrentCueToHardToHear}
                disabled={!currentCue || currentCueSaved || hardToHear.saving}
                title="Zet deze zin bij Moeilijk te verstaan"
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                {currentCueSaved ? '✓ Moeilijk te verstaan' : '+ Moeilijk te verstaan'}
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
          {jumpStarts.length > 1 && (
            <select
              value=""
              onChange={e => {
                player.seekTo(Number(e.target.value))
                // Otherwise the dropdown keeps focus and Space opens it instead of playing/pausing.
                e.target.blur()
              }}
              title="Spring naar een punt in de video"
              className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-700 bg-white"
            >
              <option value="" disabled>⏱ Spring naar…</option>
              {jumpStarts.map(start => <option key={start} value={start}>{formatClock(start)}</option>)}
            </select>
          )}
          {subtitlesFound && (
            <>
              <button onClick={() => player.seekToCueBy(-1)} title="Naar de vorige ondertitel" className={toggleClass(false)}>
                ⏮ Vorige
              </button>
              <button onClick={() => player.seekToCueBy(1)} title="Naar de volgende ondertitel" className={toggleClass(false)}>
                Volgende ⏭
              </button>
            </>
          )}
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
        {subtitlesFound && (
          <section className="rounded border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700">Moeilijk te verstaan</h2>
              {!practice.active && hardToHear.phrases.length > 0 && (
                <button type="button" onClick={() => practice.start(hardToHear.phrases)} className="px-3 py-1 text-sm rounded bg-teal-500 text-white hover:bg-teal-600">
                  Oefenen ({hardToHear.phrases.length})
                </button>
              )}
            </div>
            {hardToHear.error && <p className="text-sm text-red-500">{hardToHear.error}</p>}
            {practice.active ? (
              <HardToHearPractice practice={practice} onPlay={playHardToHear} />
            ) : hardToHear.phrases.length === 0 ? (
              <p className="text-xs text-gray-400">Nog niets. Klik bij een ondertitel op &quot;+ Moeilijk te verstaan&quot;.</p>
            ) : (
              <ul className="space-y-1">
                {hardToHear.phrases.map(phrase => (
                  <li key={phrase.id} className="flex items-start gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => playHardToHear(phrase)}
                      title={`Speel deze zin af, met ${SEGMENT_PADDING_SECONDS} s ervoor en erna`}
                      className="shrink-0 font-mono text-xs text-blue-600 hover:underline pt-0.5"
                    >
                      ▶ {formatClock(Math.floor(phrase.seconds))}
                    </button>
                    <span className="flex-1 text-gray-800">{phrase.text}</span>
                    <button
                      type="button"
                      onClick={() => hardToHear.deletePhraseAsync(phrase.id)}
                      disabled={hardToHear.saving}
                      title="Verwijderen"
                      className="shrink-0 text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {helpOpen && (
          <p className="text-xs text-gray-500 p-2 rounded border border-gray-200 bg-gray-50">
            Tik twee keer midden op de video (of druk op spatie) om te starten/stoppen, twee keer links voor 5 s terug en twee keer rechts voor 5 s vooruit. Swipen naar links/rechts en ←/→ of a/d werken ook. Met Klein/Middel/Groot/Maximaal kies je hoe groot de video is; dat wordt onthouden.
            {subtitlesFound && ' ⏮/⏭ springen naar de vorige/volgende ondertitel. Tik op de ondertitel om te pauzeren; "+ Fraselijst" zet hem in de Fraselijst, "+ Moeilijk te verstaan" zet hem in de lijst onder de video; ▶ speelt hem daar af met 2 s ervoor en erna. Klik op "Uitleg" naast een zin, of selecteer tekst in het transcript om het in ChatGPT uit te laten leggen of aan de Fraselijst toe te voegen.'}
          </p>
        )}
      </div>
      {!subtitlesFound && (
        <div className={`${sizeClasses.side} self-start p-3 rounded border border-orange-200 bg-orange-50 text-sm text-orange-800`}>
          <p className="font-medium">Ondertitels niet gevonden.</p>
          <p className="mt-1">
            Zorg dat er een .srt-bestand bestaat met dezelfde naam als de video, in dezelfde map:{' '}
            <code className="break-all">{lesson.subtitleFileName}</code>
          </p>
        </div>
      )}
      <div ref={transcriptRef} hidden={!subtitlesFound || !transcriptOpen} onMouseUp={handleTextSelection} className={`relative ${sizeClasses.side} h-[75vh] overflow-y-auto pr-2`}>
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
