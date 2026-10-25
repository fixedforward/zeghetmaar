import { useEffect, useState } from 'react'
import type { HardToHearPhrase } from '../types'

const HARD_TO_HEAR_URL = '/api/luisteren/hard-to-hear'

async function requestPhrasesAsync(url: string, init: RequestInit | undefined, fallbackError: string): Promise<HardToHearPhrase[]> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data.phrases
}

// The subtitle lines of one Drive video that I couldn't make out the first time, by video name.
export function useHardToHearPhrases(videoName: string | null) {
  const [phrases, setPhrases] = useState<HardToHearPhrase[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPhrases([])
    setError(null)
    if (!videoName) return
    let cancelled = false
    requestPhrasesAsync(`${HARD_TO_HEAR_URL}?video=${encodeURIComponent(videoName)}`, undefined, 'Kon frases niet laden.')
      .then(loaded => { if (!cancelled) setPhrases(loaded) })
      .catch((err: Error) => {
        console.error('[useHardToHearPhrases]', err.message)
        if (!cancelled) setError(err.message)
      })
    return () => { cancelled = true }
  }, [videoName])

  const saveAsync = async (method: 'POST' | 'DELETE', body: object, fallbackError: string): Promise<boolean> => {
    if (!videoName) return false
    setSaving(true)
    setError(null)
    try {
      setPhrases(await requestPhrasesAsync(HARD_TO_HEAR_URL, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: videoName, ...body }),
      }, fallbackError))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackError
      console.error('[useHardToHearPhrases]', message)
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const addPhraseAsync = (text: string, seconds: number, endSeconds: number) =>
    saveAsync('POST', { text, seconds, endSeconds }, 'Kon frase niet opslaan.')

  const deletePhraseAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon frase niet verwijderen.')

  return { phrases, saving, error, addPhraseAsync, deletePhraseAsync }
}
