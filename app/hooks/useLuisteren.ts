import { useState, useCallback } from 'react'
import type { ListeningLink } from '../types'

const LUISTEREN_URL = '/api/luisteren'

async function requestLinksAsync(init: RequestInit | undefined, fallbackError: string): Promise<ListeningLink[]> {
  const res = await fetch(LUISTEREN_URL, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data.links
}

export function useLuisteren() {
  const [links, setLinks] = useState<ListeningLink[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLinks = useCallback((force = false) => {
    if (!force && loaded) return
    setLoaded(true)
    setLoading(true)
    setError(null)
    requestLinksAsync(undefined, 'Kon links niet laden.')
      .then(setLinks)
      .catch((err: Error) => {
        console.error('[useLuisteren]', err.message)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [loaded])

  const saveAsync = async (method: 'POST' | 'DELETE', body: object, fallbackError: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      setLinks(await requestLinksAsync({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, fallbackError))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackError
      console.error('[useLuisteren]', message)
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const addLinkAsync = (url: string, title: string) => saveAsync('POST', { url, title }, 'Kon link niet opslaan.')

  const deleteLinkAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon link niet verwijderen.')

  return { links, loading, saving, error, loadLinks, addLinkAsync, deleteLinkAsync }
}
