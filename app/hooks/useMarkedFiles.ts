import { useState, useCallback } from 'react'
import type { MarkedFileKind } from '../lib/driveStore'

export function useMarkedFiles(kind: MarkedFileKind) {
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const url = `/api/marked-files/${kind}`

  const loadMarkedIds = useCallback((force = false) => {
    if (!force && loaded) return
    setLoaded(true)
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Kon afgevinkte bestanden niet laden.')
        return res.json()
      })
      .then((data: { fileIds: string[] }) => setMarkedIds(new Set(data.fileIds)))
      .catch(err => console.error('[useMarkedFiles]', err instanceof Error ? err.message : err))
  }, [loaded, url])

  const toggleMarked = (fileId: string) => {
    const isMarked = markedIds.has(fileId)
    setMarkedIds(prev => {
      const next = new Set(prev)
      isMarked ? next.delete(fileId) : next.add(fileId)
      return next
    })
    fetch(url, {
      method: isMarked ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    }).catch(err => console.error('[useMarkedFiles] Failed to save marked state —', err))
  }

  return { markedIds, loadMarkedIds, toggleMarked }
}
