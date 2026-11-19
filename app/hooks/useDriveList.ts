import { useState, useCallback } from 'react'

// A list stored on Drive behind an API route that answers every request with the whole
// list under `listKey`: GET loads it, POST/PUT/DELETE change it and return the new list.
export function useDriveList<T>(url: string, listKey: string, logTag: string, loadError: string) {
  const [items, setItems] = useState<T[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestAsync = useCallback(async (init: RequestInit | undefined, fallbackError: string): Promise<T[]> => {
    const res = await fetch(url, init)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || fallbackError)
    return data[listKey]
  }, [url, listKey])

  const load = useCallback(() => {
    if (loaded) return
    setLoaded(true)
    setLoading(true)
    setError(null)
    requestAsync(undefined, loadError)
      .then(setItems)
      .catch((err: Error) => {
        console.error(logTag, err.message)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [loaded, requestAsync, logTag, loadError])

  // Returns whether saving worked.
  const saveAsync = async (method: 'POST' | 'PUT' | 'DELETE', body: object, fallbackError: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      setItems(await requestAsync({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, fallbackError))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackError
      console.error(logTag, message)
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  return { items, loading, saving, error, load, saveAsync }
}
