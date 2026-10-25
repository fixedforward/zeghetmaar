import { useState } from 'react'
import type { HardToHearPhrase } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { insertLater, randomRequeueGap } from '../lib/requeue'
import { compareDictation, type DictationResult } from '../lib/dictation'

// Dictation on a video's hard-to-hear lines: hear a line, type it, check it.
// A line I got wrong comes back 2-5 lines later.
export function useHardToHearPractice() {
  const [queue, setQueue] = useState<HardToHearPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<DictationResult | null>(null)
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })

  const active = queue.length > 0
  const done = active && index >= queue.length
  const current = done ? null : queue[index] ?? null

  const reset = (items: HardToHearPhrase[]) => {
    setQueue(items)
    setIndex(0)
    setInput('')
    setResult(null)
    setScore({ correct: 0, incorrect: 0 })
  }

  const start = (phrases: HardToHearPhrase[]) => reset(shuffleArray(phrases))

  const stop = () => reset([])

  const check = () => {
    if (!current || result || !input.trim()) return
    setResult(compareDictation(input, current.text))
  }

  const next = (correct: boolean) => {
    if (!current || !result) return
    setScore(prev => correct ? { ...prev, correct: prev.correct + 1 } : { ...prev, incorrect: prev.incorrect + 1 })
    if (!correct) setQueue(prev => insertLater(prev, index, randomRequeueGap(), current))
    setIndex(prev => prev + 1)
    setInput('')
    setResult(null)
  }

  return { active, done, current, index, total: queue.length, input, setInput, result, score, start, stop, check, next }
}
