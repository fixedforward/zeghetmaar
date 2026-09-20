import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { usePracticeEngine } from './usePracticeEngine'

export const OEFENSESSIE_SIZE = 5

export function useOefenSessie(selectedModel: string, onPractice?: () => void) {
  const [previewPhrases, setPreviewPhrases] = useState<WordEntry[]>([])
  const [sessionPhrases, setSessionPhrases] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const engine = usePracticeEngine(selectedModel, 'useOefenSessie', onPractice)

  const currentPhrase = sessionPhrases[currentIndex] ?? null
  const isActive = sessionPhrases.length > 0
  const isFinished = isActive && currentIndex >= sessionPhrases.length

  const refreshPreview = useCallback((words: WordEntry[]) => {
    setPreviewPhrases(shuffleArray(words).slice(0, OEFENSESSIE_SIZE))
  }, [])

  const startSession = useCallback((startIndex = 0) => {
    if (previewPhrases.length === 0) return
    setSessionPhrases(previewPhrases)
    setCurrentIndex(startIndex)
    engine.resetAnswer()
    engine.generatePrompt(previewPhrases[startIndex])
  }, [previewPhrases, engine])

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

  const previousPhrase = useCallback(() => {
    if (currentIndex === 0) return
    const previous = currentIndex - 1
    setCurrentIndex(previous)
    engine.resetAnswer()
    engine.generatePrompt(sessionPhrases[previous])
  }, [currentIndex, sessionPhrases, engine])

  const submitAnswer = useCallback(() => {
    if (!currentPhrase) return
    engine.submitAnswer(currentPhrase)
  }, [currentPhrase, engine])

  return {
    previewPhrases,
    refreshPreview,
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
    previousPhrase,
    nextPhrase,
    submitAnswer,
  }
}
