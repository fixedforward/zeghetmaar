import { useState, useCallback } from 'react'
import type { LanguageIsland } from '../types'
import { buildChatGptLanguageIslandUrl, openChatGptInBackground } from '../lib/chatgpt'
import { mergeIslandOptions } from '../lib/languageIslands'

const ISLANDS_URL = '/api/language-islands'

async function requestIslandsAsync(init: RequestInit | undefined, fallbackError: string): Promise<LanguageIsland[]> {
  const res = await fetch(ISLANDS_URL, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data.islands
}

export function useLanguageIslands() {
  const [islands, setIslands] = useState<LanguageIsland[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadIslands = useCallback((force = false) => {
    if (!force && loaded) return
    setLoaded(true)
    setLoading(true)
    setError(null)
    requestIslandsAsync(undefined, 'Kon taaleilanden niet laden.')
      .then(setIslands)
      .catch((err: Error) => {
        console.error('[useLanguageIslands]', err.message)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [loaded])

  // Returns the saved list, or null when saving failed.
  const saveAsync = async (method: 'POST' | 'PUT' | 'DELETE', body: object, fallbackError: string): Promise<LanguageIsland[] | null> => {
    setSaving(true)
    setError(null)
    try {
      const saved = await requestIslandsAsync({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, fallbackError)
      setIslands(saved)
      return saved
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackError
      console.error('[useLanguageIslands]', message)
      setError(message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const addIslandAsync = async (english: string): Promise<boolean> =>
    (await saveAsync('POST', { english }, 'Kon taaleiland niet opslaan.')) !== null

  const askChatGpt = (island: LanguageIsland) => openChatGptInBackground(buildChatGptLanguageIslandUrl(island))

  const setEnglishAsync = (id: string, english: string) =>
    saveAsync('PUT', { id, english }, 'Kon frase niet opslaan.')

  const setOptionsAsync = (id: string, options: string[]) =>
    saveAsync('PUT', { id, options }, 'Kon opties niet opslaan.')

  const addOptionAsync = (island: LanguageIsland, option: string) =>
    setOptionsAsync(island.id, mergeIslandOptions(island.options, [option]))

  const deleteOptionAsync = (island: LanguageIsland, index: number) =>
    setOptionsAsync(island.id, island.options.filter((_, i) => i !== index))

  const deleteIslandAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon taaleiland niet verwijderen.')

  return {
    islands, loading, saving, error, loadIslands, addIslandAsync, askChatGpt,
    setEnglishAsync, setOptionsAsync, addOptionAsync, deleteOptionAsync, deleteIslandAsync,
  }
}
