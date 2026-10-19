import { useState, useCallback } from 'react'
import type { Mistake } from '../types'
import { cleanCell, orderLeastPracticedFirst, shiftRowsAfterDelete, type MistakeChanges } from '../lib/mistakes'
import { insertLater, randomRequeueGap } from '../lib/requeue'
import { buildChatGptMistakeFixUrl, openChatGptInBackground } from '../lib/chatgpt'

export function useMistakes(onPractice?: () => void) {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Rows, not Mistake objects, so a requeued card still shows the live count.
  const [queue, setQueue] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [markedCorrect, setMarkedCorrect] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingRow, setDeletingRow] = useState<number | null>(null)

  const current = mistakes.find(m => m.row === queue[currentIndex])
  const done = queue.length > 0 && currentIndex >= queue.length

  const startSession = useCallback((list: Mistake[]) => {
    setQueue(orderLeastPracticedFirst(list).map(m => m.row))
    setCurrentIndex(0)
    setUserInput('')
    setRevealed(false)
    setMarkedCorrect(false)
  }, [])

  const loadMistakesAsync = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mistakes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Kon fouten niet laden.')
      setMistakes(data.mistakes)
      startSession(data.mistakes)
    } catch (err) {
      console.error('[useMistakes] Failed to load mistakes:', err)
      setError(err instanceof Error ? err.message : 'Kon fouten niet laden.')
    } finally {
      setLoading(false)
    }
  }, [startSession])

  const restart = useCallback(() => startSession(mistakes), [startSession, mistakes])

  const reveal = useCallback(() => {
    if (current) setRevealed(true)
  }, [current])

  const setCount = (row: number, timesPracticed: number) =>
    setMistakes(prev => prev.map(m => m.row === row ? { ...m, timesPracticed } : m))

  const putMistakeAsync = async (target: Mistake, changes: MistakeChanges) => {
    const res = await fetch('/api/mistakes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row: target.row, mistake: target.mistake, ...changes }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Kon de wijziging niet opslaan.')
  }

  const toggleCorrectAsync = useCallback(async () => {
    if (!current || !revealed || saving) return
    const previous = current.timesPracticed
    const next = markedCorrect ? previous - 1 : previous + 1
    const wasMarked = markedCorrect
    setCount(current.row, next)
    setMarkedCorrect(!wasMarked)
    if (!wasMarked) onPractice?.()
    setSaving(true)
    try {
      await putMistakeAsync(current, { timesPracticed: next })
      setError(null)
    } catch (err) {
      console.error('[useMistakes] Failed to save count:', err)
      setCount(current.row, previous)
      setMarkedCorrect(wasMarked)
      setError(err instanceof Error ? err.message : 'Kon de teller niet opslaan.')
    } finally {
      setSaving(false)
    }
  }, [current, revealed, saving, markedCorrect, onPractice])

  const saveCorrectionAsync = useCallback(async (text: string): Promise<boolean> => {
    const correction = cleanCell(text)
    if (!current || saving || !correction || correction === current.correction) return false
    setSaving(true)
    try {
      await putMistakeAsync(current, { correction })
      setMistakes(prev => prev.map(m => m.row === current.row ? { ...m, correction } : m))
      setError(null)
      return true
    } catch (err) {
      console.error('[useMistakes] Failed to save correction:', err)
      setError(err instanceof Error ? err.message : 'Kon de wijziging niet opslaan.')
      return false
    } finally {
      setSaving(false)
    }
  }, [current, saving])

  const next = useCallback(() => {
    if (!current || !revealed) return
    const answeredIndex = currentIndex
    if (!markedCorrect) setQueue(prev => insertLater(prev, answeredIndex, randomRequeueGap(), prev[answeredIndex]))
    setCurrentIndex(answeredIndex + 1)
    setUserInput('')
    setRevealed(false)
    setMarkedCorrect(false)
  }, [current, revealed, currentIndex, markedCorrect])

  const deleteMistakeAsync = useCallback(async (row: number) => {
    const target = mistakes.find(m => m.row === row)
    if (!target || saving || deletingRow !== null) return
    setDeletingRow(row)
    try {
      const res = await fetch('/api/mistakes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, mistake: target.mistake }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Kon de fout niet verwijderen.')
      const removedBefore = queue.slice(0, currentIndex).filter(r => r === row).length
      if (queue[currentIndex] === row) {
        setUserInput('')
        setRevealed(false)
        setMarkedCorrect(false)
      }
      setMistakes(prev => shiftRowsAfterDelete(prev, row))
      setQueue(prev => prev.filter(r => r !== row).map(r => r > row ? r - 1 : r))
      setCurrentIndex(index => index - removedBefore)
      setError(null)
    } catch (err) {
      console.error('[useMistakes] Failed to delete mistake:', err)
      setError(err instanceof Error ? err.message : 'Kon de fout niet verwijderen.')
    } finally {
      setDeletingRow(null)
    }
  }, [mistakes, saving, deletingRow, queue, currentIndex])

  const askChatGpt = useCallback(() => {
    if (!current || !userInput.trim()) return
    openChatGptInBackground(buildChatGptMistakeFixUrl(current, userInput.trim()))
  }, [current, userInput])

  return {
    mistakes, loading, error, queue, currentIndex, current, done,
    userInput, setUserInput, revealed, markedCorrect, saving, deletingRow,
    loadMistakesAsync, restart, reveal, toggleCorrectAsync, saveCorrectionAsync, next, askChatGpt, deleteMistakeAsync,
  }
}
