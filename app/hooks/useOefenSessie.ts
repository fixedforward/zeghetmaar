import { useState, useCallback, useRef } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { usePracticeEngine } from './usePracticeEngine'

export const OEFENSESSIE_SIZE = 10
const EXTRA_WORD_COUNT = 2

export function useOefenSessie(selectedModel: string, onPractice?: () => void) {
  const [previewPhrases, setPreviewPhrases] = useState<WordEntry[]>([])
  const [sessionPhrases, setSessionPhrases] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [extraWords, setExtraWords] = useState<WordEntry[]>([])
  const engine = usePracticeEngine(selectedModel, 'useOefenSessie', onPractice)

  // Prompts for the previewed phrases start downloading in the background as
  // soon as the preview list loads, so by the time the user picks one to start
  // with (or navigates to the next/previous one) it's usually already there —
  // cached by phrase id, with in-flight fetches shared so prefetch and an
  // impatient click on the same phrase don't fire the request twice.
  const promptCache = useRef<Map<string, string>>(new Map())
  const pendingFetches = useRef<Map<string, Promise<string>>>(new Map())

  // The extra (non-target) phrases woven into each phrase's situation, cached
  // alongside the prompt so re-showing a phrase shows the same two phrases
  // that were actually used to generate its cached situation.
  const extraWordsCache = useRef<Map<string, WordEntry[]>>(new Map())
  const allWordsRef = useRef<WordEntry[]>([])

  const currentPhrase = sessionPhrases[currentIndex] ?? null
  const isActive = sessionPhrases.length > 0
  const isFinished = isActive && currentIndex >= sessionPhrases.length

  const pickExtraWords = useCallback((phrase: WordEntry): WordEntry[] => {
    return shuffleArray(allWordsRef.current.filter(w => w.id !== phrase.id)).slice(0, EXTRA_WORD_COUNT)
  }, [])

  const getOrFetchPrompt = useCallback((phrase: WordEntry): Promise<string> => {
    const cached = promptCache.current.get(phrase.id)
    if (cached !== undefined) return Promise.resolve(cached)

    const pending = pendingFetches.current.get(phrase.id)
    if (pending) return pending

    if (!extraWordsCache.current.has(phrase.id)) {
      extraWordsCache.current.set(phrase.id, pickExtraWords(phrase))
    }
    const extras = extraWordsCache.current.get(phrase.id) ?? []

    const request = engine.fetchPromptFor(phrase, extras).then(text => {
      promptCache.current.set(phrase.id, text)
      pendingFetches.current.delete(phrase.id)
      return text
    })
    pendingFetches.current.set(phrase.id, request)
    return request
  }, [engine, pickExtraWords])

  const prefetchPrompts = useCallback((phrases: WordEntry[]) => {
    phrases.forEach(phrase => { getOrFetchPrompt(phrase) })
  }, [getOrFetchPrompt])

  const loadPrompt = useCallback((phrase: WordEntry) => {
    if (!extraWordsCache.current.has(phrase.id)) {
      extraWordsCache.current.set(phrase.id, pickExtraWords(phrase))
    }
    setExtraWords(extraWordsCache.current.get(phrase.id) ?? [])

    const cached = promptCache.current.get(phrase.id)
    if (cached !== undefined) {
      engine.setPromptImmediate(cached)
      return
    }
    engine.beginPromptLoading()
    getOrFetchPrompt(phrase).then(text => engine.setPromptImmediate(text))
  }, [engine, getOrFetchPrompt, pickExtraWords])

  const refreshPreview = useCallback((words: WordEntry[]) => {
    allWordsRef.current = words
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
    setExtraWords([])
    engine.reset()
  }, [engine])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    engine.resetAnswer()
    engine.beginPromptLoading()
    const extras = pickExtraWords(currentPhrase)
    extraWordsCache.current.set(currentPhrase.id, extras)
    setExtraWords(extras)
    engine.fetchPromptFor(currentPhrase, extras).then(text => {
      promptCache.current.set(currentPhrase.id, text)
      engine.setPromptImmediate(text)
    })
  }, [currentPhrase, engine, pickExtraWords])

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
    engine.submitAnswer(currentPhrase, extraWords)
  }, [currentPhrase, engine, extraWords])

  return {
    previewPhrases,
    refreshPreview,
    sessionPhrases,
    currentIndex,
    currentPhrase,
    isActive,
    isFinished,
    extraWords,
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
