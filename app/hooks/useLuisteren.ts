import { useState, useCallback } from 'react'
import type { ListeningLink, ListeningPhrase } from '../types'

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
      console.error('[useLuisteren]', message)
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const addLinkAsync = (url: string, title: string) => saveAsync('POST', { url, title }, 'Kon link niet opslaan.')

  const setPositionAsync = (id: string, positionSeconds: number | null) =>
    saveAsync('PUT', { id, positionSeconds }, 'Kon tijdstip niet opslaan.')

  const setPhrasesAsync = (linkId: string, update: (phrases: ListeningPhrase[]) => ListeningPhrase[]) => {
    const current = links.find(l => l.id === linkId)?.phrases ?? []
    return saveAsync('PUT', { id: linkId, phrases: update(current) }, 'Kon woorden niet opslaan.')
  }

  const addPhraseAsync = (linkId: string, text: string, seconds: number | null = null) =>
    setPhrasesAsync(linkId, phrases => [
      ...phrases,
      { id: Date.now().toString(), text: text.trim(), imported: false, seconds: seconds ?? undefined },
    ])

  // null clears the time; JSON.stringify drops the undefined field.
  const setPhraseSecondsAsync = (linkId: string, phraseId: string, seconds: number | null) =>
    setPhrasesAsync(linkId, phrases => phrases.map(p => p.id === phraseId ? { ...p, seconds: seconds ?? undefined } : p))

  const deletePhraseAsync = (linkId: string, phraseId: string) =>
    setPhrasesAsync(linkId, phrases => phrases.filter(p => p.id !== phraseId))

  const markPhraseImportedAsync = (linkId: string, phraseId: string) =>
    setPhrasesAsync(linkId, phrases => phrases.map(p => p.id === phraseId ? { ...p, imported: true } : p))

  const deleteLinkAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon link niet verwijderen.')

  return {
    links, loading, saving, error, loadLinks, addLinkAsync, setPositionAsync,
    addPhraseAsync, setPhraseSecondsAsync, deletePhraseAsync, markPhraseImportedAsync, deleteLinkAsync,
  }
}
