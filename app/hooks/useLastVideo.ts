import { useEffect, useState } from 'react'

export const LAST_VIDEO_STORAGE_KEY = 'luisteren-last-video'

export interface LastVideo {
  folderId: string
  fileId: string
  name: string
}

function isLastVideo(value: unknown): value is LastVideo {
  const v = value as LastVideo | null
  return typeof v?.folderId === 'string' && typeof v.fileId === 'string' && typeof v.name === 'string'
}

export function saveLastVideo(video: LastVideo) {
  try {
    localStorage.setItem(LAST_VIDEO_STORAGE_KEY, JSON.stringify(video))
  } catch {
    // The "Verder kijken" button just won't show.
  }
}

export function useLastVideo(): LastVideo | null {
  const [lastVideo, setLastVideo] = useState<LastVideo | null>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LAST_VIDEO_STORAGE_KEY) ?? 'null')
      if (isLastVideo(stored)) setLastVideo(stored)
    } catch {
      // localStorage unavailable or corrupt — no button.
    }
  }, [])

  return lastVideo
}
