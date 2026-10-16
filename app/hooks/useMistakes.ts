import { useState, useCallback } from 'react'
import type { Mistake } from '../types'
import { orderLeastPracticedFirst } from '../lib/mistakes'
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
      const res = await fetch('/api/mistakes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: current.row, mistake: current.mistake, timesPracticed: next }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Kon de teller niet opslaan.')
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

  const next = useCallback(() => {
    if (!current || !revealed) return
    const answeredIndex = currentIndex
    if (!markedCorrect) setQueue(prev => insertLater(prev, answeredIndex, randomRequeueGap(), prev[answeredIndex]))
    setCurrentIndex(answeredIndex + 1)
    setUserInput('')
    setRevealed(false)
    setMarkedCorrect(false)
  }, [current, revealed, currentIndex, markedCorrect])

  const askChatGpt = useCallback(() => {
    if (!current || !userInput.trim()) return
    openChatGptInBackground(buildChatGptMistakeFixUrl(current, userInput.trim()))
  }, [current, userInput])

  return {
    mistakes, loading, error, queue, currentIndex, current, done,
    userInput, setUserInput, revealed, markedCorrect, saving,
    loadMistakesAsync, restart, reveal, toggleCorrectAsync, next, askChatGpt,
  }
}
