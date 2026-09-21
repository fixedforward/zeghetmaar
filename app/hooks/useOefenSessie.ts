import { useState, useCallback, useRef } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { usePracticeEngine } from './usePracticeEngine'

export const OEFENSESSIE_SIZE = 10

export function useOefenSessie(selectedModel: string, onPractice?: () => void) {
  const [previewPhrases, setPreviewPhrases] = useState<WordEntry[]>([])
  const [sessionPhrases, setSessionPhrases] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const engine = usePracticeEngine(selectedModel, 'useOefenSessie', onPractice)

  // Prompts for the previewed phrases start downloading in the background as
  // soon as the preview list loads, so by the time the user picks one to start
  // with (or navigates to the next/previous one) it's usually already there —
  // cached by phrase id, with in-flight fetches shared so prefetch and an
  // impatient click on the same phrase don't fire the request twice.
  const promptCache = useRef<Map<string, string>>(new Map())
  const pendingFetches = useRef<Map<string, Promise<string>>>(new Map())

  const currentPhrase = sessionPhrases[currentIndex] ?? null
  const isActive = sessionPhrases.length > 0
  const isFinished = isActive && currentIndex >= sessionPhrases.length

  const getOrFetchPrompt = useCallback((phrase: WordEntry): Promise<string> => {
    const cached = promptCache.current.get(phrase.id)
    if (cached !== undefined) return Promise.resolve(cached)

    const pending = pendingFetches.current.get(phrase.id)
    if (pending) return pending

    const request = engine.fetchPromptFor(phrase).then(text => {
      promptCache.current.set(phrase.id, text)
      pendingFetches.current.delete(phrase.id)
      return text
    })
    pendingFetches.current.set(phrase.id, request)
    return request
  }, [engine])

  const prefetchPrompts = useCallback((phrases: WordEntry[]) => {
    phrases.forEach(phrase => { getOrFetchPrompt(phrase) })
  }, [getOrFetchPrompt])

  const loadPrompt = useCallback((phrase: WordEntry) => {
    const cached = promptCache.current.get(phrase.id)
    if (cached !== undefined) {
      engine.setPromptImmediate(cached)
      return
    }
    engine.beginPromptLoading()
    getOrFetchPrompt(phrase).then(text => engine.setPromptImmediate(text))
  }, [engine, getOrFetchPrompt])

  const refreshPreview = useCallback((words: WordEntry[]) => {
    const selected = shuffleArray(words).slice(0, OEFENSESSIE_SIZE)
    setPreviewPhrases(selected)
    prefetchPrompts(selected)
  }, [prefetchPrompts])

  const startSession = useCallback((startIndex = 0) => {
    if (previewPhrases.length === 0) return
    setSessionPhrases(previewPhrases)
    setCurrentIndex(startIndex)
    engine.resetAnswer()
    loadPrompt(previewPhrases[startIndex])
  }, [previewPhrases, engine, loadPrompt])

  const stopSession = useCallback(() => {
    setSessionPhrases([])
    setCurrentIndex(0)
    engine.reset()
  }, [engine])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    engine.resetAnswer()
    engine.beginPromptLoading()
    engine.fetchPromptFor(currentPhrase).then(text => {
      promptCache.current.set(currentPhrase.id, text)
      engine.setPromptImmediate(text)
    })
  }, [currentPhrase, engine])

  const previousPhrase = useCallback(() => {
    if (currentIndex === 0) return
    const previous = currentIndex - 1
    setCurrentIndex(previous)
    engine.resetAnswer()
    loadPrompt(sessionPhrases[previous])
  }, [currentIndex, sessionPhrases, engine, loadPrompt])

  const nextPhrase = useCallback(() => {
    const next = currentIndex + 1
    setCurrentIndex(next)
    engine.resetAnswer()
    if (next < sessionPhrases.length) loadPrompt(sessionPhrases[next])
  }, [currentIndex, sessionPhrases, loadPrompt])

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
