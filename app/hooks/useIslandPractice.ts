import { useState, useCallback, useEffect } from 'react'
import type { LanguageIsland } from '../types'
import { pickPracticeIslands } from '../lib/languageIslands'
import { insertLater, randomRequeueGap } from '../lib/requeue'

export const PRACTICE_SIZE = 5
export const SECONDS_PER_CARD = 10

export function useIslandPractice() {
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
    const picked = pickPracticeIslands(islands, PRACTICE_SIZE)
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
    setFirstTry(prev => current.id in prev ? prev : { ...prev, [current.id]: correct })
    const nextQueue = correct ? queue : insertLater(queue, index, randomRequeueGap(), current)
    setQueue(nextQueue)
    if (index + 1 >= nextQueue.length) {
      setFinishedAt(Date.now())
      return
    }
    setIndex(index + 1)
    startCard()
  }, [current, revealed, queue, index])

  const results = Object.values(firstTry)

  return {
    active, finished, current, cardIndex: index, revealed, secondsLeft,
    score: results.filter(Boolean).length,
    total: results.length,
    totalSeconds: finishedAt === null ? 0 : Math.round((finishedAt - startedAt) / 1000),
    start, stop, reveal, markAndNext,
  }
}
