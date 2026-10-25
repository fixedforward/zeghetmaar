import { useEffect, useState } from 'react'
import type { HardToHearVideo } from '../types'

// Every video with saved hard-to-hear lines, for the practice overview.
export function useHardToHearVideos() {
  const [videos, setVideos] = useState<HardToHearVideo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/luisteren/hard-to-hear/videos')
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kon de video\'s niet laden.')
        if (!cancelled) setVideos(data.videos)
      })
      .catch((err: Error) => {
        console.error('[useHardToHearVideos]', err.message)
        if (!cancelled) setError(err.message)
      })
    return () => { cancelled = true }
  }, [])

  return { videos, error }
}
