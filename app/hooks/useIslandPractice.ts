import { useState, useCallback, useEffect } from 'react'
import type { LanguageIsland } from '../types'
import { pickPracticeIslands } from '../lib/languageIslands'
import { insertLater, randomRequeueGap } from '../lib/requeue'

export const PRACTICE_SIZE = 10
// Infinity practices every island that has options.
export const PRACTICE_SIZE_OPTIONS = [5, 10, 20, 30, Infinity]
export const PRACTICE_SIZE_STORAGE_KEY = 'taaleilanden-practice-size'
export const SECONDS_PER_CARD = 10

export function useIslandPractice(onPractice?: () => void) {
  const [size, setSizeState] = useState(PRACTICE_SIZE)
  const [queue, setQueue] = useState<LanguageIsland[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  // First answer per island id: a card that comes back doesn't change the score.
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({})
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)

  const active = queue.length > 0
  const finished = finishedAt !== null
  const current = active && !finished ? queue[index] : null
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000))

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PRACTICE_SIZE_STORAGE_KEY))
      if (PRACTICE_SIZE_OPTIONS.includes(stored)) setSizeState(stored)
    } catch {
      // localStorage unavailable — keep the default.
    }
  }, [])

  const setSize = useCallback((next: number) => {
    setSizeState(next)
    try {
      localStorage.setItem(PRACTICE_SIZE_STORAGE_KEY, String(next))
    } catch {
      // Setting just won't persist across reloads.
    }
  }, [])

  useEffect(() => {
    if (!current || revealed) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [current, revealed])

  useEffect(() => {
    if (current && !revealed && now >= deadline) setRevealed(true)
  }, [current, revealed, now, deadline])

  // Only calls state setters, so it's safe to leave out of the useCallback deps below.
  const startCard = () => {
    const t = Date.now()
    setRevealed(false)
    setNow(t)
    setDeadline(t + SECONDS_PER_CARD * 1000)
  }

  const start = (islands: LanguageIsland[]) => {
    const picked = pickPracticeIslands(islands, size)
    if (picked.length === 0) return
    setQueue(picked)
    setIndex(0)
    setFirstTry({})
    setFinishedAt(null)
    setStartedAt(Date.now())
    startCard()
  }

  const stop = () => {
    setQueue([])
    setFinishedAt(null)
  }

  const reveal = useCallback(() => {
    if (current) setRevealed(true)
  }, [current])

  const markAndNext = useCallback((correct: boolean) => {
    if (!current || !revealed) return
    onPractice?.()
    setFirstTry(prev => current.id in prev ? prev : { ...prev, [current.id]: correct })
    const nextQueue = correct ? queue : insertLater(queue, index, randomRequeueGap(), current)
    setQueue(nextQueue)
    if (index + 1 >= nextQueue.length) {
      setFinishedAt(Date.now())
      return
    }
    setIndex(index + 1)
    startCard()
  }, [current, revealed, queue, index, onPractice])

  const results = Object.values(firstTry)

  return {
    active, finished, current, cardIndex: index, queueLength: queue.length, revealed, secondsLeft,
    score: results.filter(Boolean).length,
    total: results.length,
    totalSeconds: finishedAt === null ? 0 : Math.round((finishedAt - startedAt) / 1000),
    size, setSize, start, stop, reveal, markAndNext,
  }
}
