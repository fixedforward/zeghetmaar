import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { usePracticeEngine } from './usePracticeEngine'

const EXTRA_WORD_COUNT = 2

export function usePhrasePractice(selectedModel: string, allWords: WordEntry[]) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPhrase, setCurrentPhrase] = useState<WordEntry | null>(null)
  const [extraWords, setExtraWords] = useState<WordEntry[]>([])
  const engine = usePracticeEngine(selectedModel, 'usePhrasePractice')

  const pickExtraWords = useCallback((phrase: WordEntry): WordEntry[] => {
    return shuffleArray(allWords.filter(w => w.id !== phrase.id)).slice(0, EXTRA_WORD_COUNT)
  }, [allWords])

  const open = useCallback((phrase: WordEntry) => {
    setCurrentPhrase(phrase)
    engine.resetAnswer()
    setIsOpen(true)
    const extras = pickExtraWords(phrase)
    setExtraWords(extras)
    engine.generatePrompt(phrase, extras)
  }, [engine, pickExtraWords])

  const close = useCallback(() => {
    setIsOpen(false)
    setCurrentPhrase(null)
    setExtraWords([])
    engine.reset()
  }, [engine])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    engine.resetAnswer()
    const extras = pickExtraWords(currentPhrase)
    setExtraWords(extras)
    engine.generatePrompt(currentPhrase, extras)
  }, [currentPhrase, engine, pickExtraWords])

  const submitAnswer = useCallback(() => {
    if (!currentPhrase) return
    engine.submitAnswer(currentPhrase, extraWords)
  }, [currentPhrase, engine, extraWords])

  return {
    isOpen,
    currentPhrase,
    extraWords,
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
