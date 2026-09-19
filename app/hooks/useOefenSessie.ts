import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { usePracticeEngine } from './usePracticeEngine'

export const OEFENSESSIE_SIZE = 5

export function useOefenSessie(selectedModel: string) {
  const [sessionPhrases, setSessionPhrases] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const engine = usePracticeEngine(selectedModel, 'useOefenSessie')

  const currentPhrase = sessionPhrases[currentIndex] ?? null
  const isActive = sessionPhrases.length > 0
  const isFinished = isActive && currentIndex >= sessionPhrases.length

  const startSession = useCallback((words: WordEntry[]) => {
    const selected = shuffleArray(words).slice(0, OEFENSESSIE_SIZE)
    setSessionPhrases(selected)
    setCurrentIndex(0)
    engine.resetAnswer()
    if (selected.length > 0) engine.generatePrompt(selected[0])
  }, [engine])

  const stopSession = useCallback(() => {
    setSessionPhrases([])
    setCurrentIndex(0)
    engine.reset()
  }, [engine])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    engine.resetAnswer()
    engine.generatePrompt(currentPhrase)
  }, [currentPhrase, engine])

  const nextPhrase = useCallback(() => {
    const next = currentIndex + 1
    setCurrentIndex(next)
    engine.resetAnswer()
    if (next < sessionPhrases.length) engine.generatePrompt(sessionPhrases[next])
  }, [currentIndex, sessionPhrases, engine])

  const submitAnswer = useCallback(() => {
    if (!currentPhrase) return
    engine.submitAnswer(currentPhrase)
  }, [currentPhrase, engine])

  return {
    sessionPhrases,
    currentIndex,
    currentPhrase,
    isActive,
    isFinished,
    prompt: engine.prompt,
    promptLoading: engine.promptLoading,
    userAnswer: engine.userAnswer,
    setUserAnswer: engine.setUserAnswer,
    evaluation: engine.evaluation,
    evaluationLoading: engine.evaluationLoading,
    startSession,
    stopSession,
    regeneratePrompt,
    nextPhrase,
    submitAnswer,
  }
}
