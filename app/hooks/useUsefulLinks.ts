import { useState, useCallback } from 'react'
import type { UsefulLink } from '../types'

const LINKS_URL = '/api/useful-links'

async function requestLinksAsync(init: RequestInit | undefined, fallbackError: string): Promise<UsefulLink[]> {
  const res = await fetch(LINKS_URL, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data.links
}

export function useUsefulLinks() {
  const [links, setLinks] = useState<UsefulLink[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLinks = useCallback(() => {
    if (loaded) return
    setLoaded(true)
    setLoading(true)
    setError(null)
    requestLinksAsync(undefined, 'Kon links niet laden.')
      .then(setLinks)
      .catch((err: Error) => {
        console.error('[useUsefulLinks]', err.message)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [loaded])

  // Returns whether saving worked.
  const saveAsync = async (method: 'POST' | 'PUT' | 'DELETE', body: object, fallbackError: string): Promise<boolean> => {
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
      console.error('[useUsefulLinks]', message)
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const addLinkAsync = (title: string, url: string) => saveAsync('POST', { title, url }, 'Kon link niet opslaan.')
  const setTitleAsync = (id: string, title: string) => saveAsync('PUT', { id, title }, 'Kon naam niet opslaan.')
  const setUrlAsync = (id: string, url: string) => saveAsync('PUT', { id, url }, 'Kon link niet opslaan.')
  const deleteLinkAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon link niet verwijderen.')

  return { links, loading, saving, error, loadLinks, addLinkAsync, setTitleAsync, setUrlAsync, deleteLinkAsync }
}
