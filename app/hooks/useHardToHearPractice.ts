import { useState } from 'react'
import type { HardToHearPhrase } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { insertLater, randomRequeueGap } from '../lib/requeue'

// Listening practice on a video's hard-to-hear lines: hear a line, check the subtitle if
// needed, and mark it. A line I didn't understand comes back 2-5 lines later.
export function useHardToHearPractice() {
  const [queue, setQueue] = useState<HardToHearPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })

  const active = queue.length > 0
  const done = active && index >= queue.length
  const current = done ? null : queue[index] ?? null

  const reset = (items: HardToHearPhrase[]) => {
    setQueue(items)
    setIndex(0)
    setScore({ correct: 0, incorrect: 0 })
  }

  const start = (phrases: HardToHearPhrase[]) => reset(shuffleArray(phrases))

  const stop = () => reset([])

  const next = (understood: boolean) => {
    if (!current) return
    setScore(prev => understood ? { ...prev, correct: prev.correct + 1 } : { ...prev, incorrect: prev.incorrect + 1 })
    if (!understood) setQueue(prev => insertLater(prev, index, randomRequeueGap(), current))
    setIndex(prev => prev + 1)
  }

  return { active, done, current, index, total: queue.length, score, start, stop, next }
}
