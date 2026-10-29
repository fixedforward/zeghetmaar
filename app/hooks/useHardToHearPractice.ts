import { useState } from 'react'
import type { HardToHearPhrase } from '../types'
import { shuffleArray } from '../lib/shuffle'

export const PRACTICE_SIZE = 10

// How many lines one session practices: 10 random ones, or all of them when there are fewer.
export function practiceSize(lineCount: number): number {
  return Math.min(lineCount, PRACTICE_SIZE)
}

// Listening practice on up to 10 random hard-to-hear lines of a video: hear a line, check the subtitle if
// needed, and go to the previous or next one.
export function useHardToHearPractice() {
  const [queue, setQueue] = useState<HardToHearPhrase[]>([])
  const [index, setIndex] = useState(0)

  const active = queue.length > 0
  const current = queue[index] ?? null
  const hasPrevious = index > 0
  const hasNext = index < queue.length - 1

  const reset = (items: HardToHearPhrase[]) => {
    setQueue(items)
    setIndex(0)
  }

  const start = (phrases: HardToHearPhrase[]) => reset(shuffleArray(phrases).slice(0, PRACTICE_SIZE))

  const stop = () => reset([])

  const previous = () => setIndex(prev => Math.max(0, prev - 1))

  const next = () => setIndex(prev => Math.min(queue.length - 1, prev + 1))

  return { active, current, index, total: queue.length, hasPrevious, hasNext, start, stop, previous, next }
}
