import { useEffect, useState } from 'react'
import type { PictureFile } from '../types'

export function usePictures(enabled: boolean) {
  const [pictures, setPictures] = useState<PictureFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/pictures')
      .then(res => {
        if (!res.ok) throw new Error('Kon de afbeeldingen niet laden')
        return res.json()
      })
      .then((data: PictureFile[]) => { if (!cancelled) setPictures(data) })
      .catch((err: Error) => {
        console.error('[usePictures]', err.message)
        if (!cancelled) setError(err.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled])

  return { pictures, loading, error }
}
