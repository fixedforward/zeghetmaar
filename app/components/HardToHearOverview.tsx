'use client'

import { useHardToHearVideos } from '../hooks/useHardToHearVideos'
import { listeningPlayerUrl } from './ListeningTree'

export function hardToHearPracticeUrl(folderId: string, fileId: string): string {
  return `/luisteren-oefenen?folder=${encodeURIComponent(folderId)}&file=${encodeURIComponent(fileId)}`
}

export function HardToHearOverview() {
  const { videos, error } = useHardToHearVideos()

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!videos) return <p className="text-sm text-gray-400">Laden...</p>
  if (videos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Nog geen fragmenten. Open een video in het Luisteren-tab en klik bij een ondertitel op &quot;+ Moeilijk te verstaan&quot;.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {videos.map(video => (
        <li key={video.key} className="border rounded p-3 bg-white space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-gray-800">{video.name}</span>
            {video.folderId && video.fileId ? (
              <div className="flex items-center gap-3">
                <a href={listeningPlayerUrl(video.folderId, video.fileId)} className="text-sm text-blue-600 hover:underline">Openen in speler</a>
                <a
                  href={hardToHearPracticeUrl(video.folderId, video.fileId)}
                  className="px-3 py-1 text-sm rounded bg-teal-500 text-white hover:bg-teal-600"
                >
                  Oefenen ({video.phrases.length})
                </a>
              </div>
            ) : (
              <span className="text-xs text-orange-700">Video niet gevonden in de Luisteren-map</span>
            )}
          </div>
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer select-none">
              {video.phrases.length} {video.phrases.length === 1 ? 'fragment' : 'fragmenten'}
            </summary>
            <ul className="mt-1 space-y-0.5 text-sm text-gray-700">
              {video.phrases.map(phrase => <li key={phrase.id}>{phrase.text}</li>)}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  )
}
