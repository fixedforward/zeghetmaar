'use client'

import { useTranscriptPlayer } from '../hooks/useTranscriptPlayer'
import { useHardToHearPhrases } from '../hooks/useHardToHearPhrases'
import { practiceSize, useHardToHearPractice } from '../hooks/useHardToHearPractice'
import { HardToHearPractice } from './HardToHearPractice'
import { listeningPlayerUrl } from './ListeningTree'

// Practice the hard-to-hear lines of one video; the video stays visible so you can also
// watch the line, but the practice plays it for you.
export function HardToHearVideoPractice({ folderId, fileId }: { folderId: string; fileId: string }) {
  const player = useTranscriptPlayer(folderId, fileId)
  const hardToHear = useHardToHearPhrases(player.lesson?.name ?? null)
  const practice = useHardToHearPractice()

  if (player.error) return <p className="text-sm text-red-500">{player.error}</p>
  if (!player.lesson) return <p className="text-sm text-gray-400">Laden...</p>

  const { lesson } = player
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-gray-800">{lesson.name}</h1>
        <a href={listeningPlayerUrl(folderId, fileId)} className="text-sm text-blue-600 hover:underline">Openen in speler</a>
      </div>
      <video
        ref={player.mediaRef}
        src={`/api/luisteren/media/${encodeURIComponent(lesson.mediaFileId)}`}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={player.syncActiveCue}
        className={`w-full rounded bg-black ${lesson.isAudio ? 'aspect-video' : 'max-h-[50vh]'}`}
      />
      <section className="rounded border border-gray-200 p-3 space-y-2">
        {hardToHear.error && <p className="text-sm text-red-500">{hardToHear.error}</p>}
        {practice.active ? (
          <HardToHearPractice practice={practice} onPlay={player.playHardToHear} linesAround={player.linesAround} />
        ) : hardToHear.phrases.length === 0 ? (
          <p className="text-sm text-gray-500">Deze video heeft (nog) geen fragmenten.</p>
        ) : (
          <button
            type="button"
            onClick={() => practice.start(hardToHear.phrases)}
            className="px-4 py-2 text-sm rounded bg-teal-500 text-white hover:bg-teal-600"
          >
            Start ({practiceSize(hardToHear.phrases.length)} {practiceSize(hardToHear.phrases.length) === 1 ? 'fragment' : 'fragmenten'})
          </button>
        )}
      </section>
    </div>
  )
}
