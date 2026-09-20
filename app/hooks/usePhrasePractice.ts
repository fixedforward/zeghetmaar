import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { usePracticeEngine } from './usePracticeEngine'

export function usePhrasePractice(selectedModel: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPhrase, setCurrentPhrase] = useState<WordEntry | null>(null)
  const engine = usePracticeEngine(selectedModel, 'usePhrasePractice')

  const open = useCallback((phrase: WordEntry) => {
    setCurrentPhrase(phrase)
    engine.resetAnswer()
    setIsOpen(true)
    engine.generatePrompt(phrase)
  }, [engine])

  const close = useCallback(() => {
    setIsOpen(false)
    setCurrentPhrase(null)
    engine.reset()
  }, [engine])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    engine.resetAnswer()
    engine.generatePrompt(currentPhrase)
  }, [currentPhrase, engine])

  const submitAnswer = useCallback(() => {
    if (!currentPhrase) return
    engine.submitAnswer(currentPhrase)
  }, [currentPhrase, engine])

  return {
    isOpen,
    currentPhrase,
    prompt: engine.prompt,
    promptLoading: engine.promptLoading,
    userAnswer: engine.userAnswer,
    setUserAnswer: engine.setUserAnswer,
    evaluation: engine.evaluation,
    evaluationLoading: engine.evaluationLoading,
    open,
    close,
    regeneratePrompt,
    submitAnswer,
  }
}
