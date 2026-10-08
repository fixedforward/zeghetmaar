import { useCallback, useRef, useState } from 'react'
import type { ListeningTreeFolder } from '../types'

export function useListeningTree() {
  const [tree, setTree] = useState<ListeningTreeFolder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)

  const loadTree = useCallback((force = false) => {
    if (!force && requested.current) return
    requested.current = true
    setLoading(true)
    setError(null)
    fetch('/api/luisteren/tree')
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Kon de luistermap niet laden.')
        setTree(data)
      })
      .catch((err: Error) => {
        console.error('[useListeningTree]', err.message)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return { tree, loading, error, loadTree }
}
