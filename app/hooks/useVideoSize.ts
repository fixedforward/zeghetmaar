import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_VIDEO_SIZE, isVideoSize, type VideoSize } from '../lib/videoSize'

export const VIDEO_SIZE_STORAGE_KEY = 'luisteren-video-size'

export function useVideoSize() {
  const [size, setSizeState] = useState<VideoSize>(DEFAULT_VIDEO_SIZE)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIDEO_SIZE_STORAGE_KEY)
      if (isVideoSize(stored)) setSizeState(stored)
    } catch {
      // localStorage unavailable — keep the default.
    }
  }, [])

  const setSize = useCallback((next: VideoSize) => {
    setSizeState(next)
    try {
      localStorage.setItem(VIDEO_SIZE_STORAGE_KEY, next)
    } catch {
      // Setting just won't persist across reloads.
    }
  }, [])

  return { size, setSize }
}
