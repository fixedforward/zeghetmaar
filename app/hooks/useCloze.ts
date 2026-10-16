import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { insertLater, randomRequeueGap } from '../lib/requeue'
import { buildClozeQuestions, buildFlashcards, type ClozeQuestion } from '../lib/cloze'

// 'typen' is the Clozemaster-style session (type the missing word); 'kaarten'
// is the Anki-style one: each phrase is practiced in both directions,
// with the direction stored on each card so retries keep the same front.
export type ClozeMode = 'typen' | 'kaarten'

export function useCloze(onPractice?: (mode: ClozeMode) => void) {
  const [mode, setMode] = useState<ClozeMode>('typen')
  const [questions, setQuestions] = useState<ClozeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [givenUpWord, setGivenUpWord] = useState<string | null>(null)
  const [answers, setAnswers] = useState<(boolean | null)[]>([])

  // Derived from answers, not tracked separately — this way jumping back to an
  // already-answered question and re-checking it updates the score correctly
  // instead of double-counting.
  const score = {
    correct: answers.filter(a => a === true).length,
    incorrect: answers.filter(a => a === false).length,
  }

  const reversed = questions[currentIndex]?.reversed ?? false

  const start = useCallback((words: WordEntry[], sessionMode: ClozeMode = 'typen') => {
    const cards = sessionMode === 'kaarten'
      ? buildFlashcards(words).flatMap(card => [
          { ...card, reversed: false },
          { ...card, reversed: true },
        ])
      : buildClozeQuestions(words)
    const built = shuffleArray(cards)
    setMode(sessionMode)
    setGivenUpWord(null)
    setQuestions(built)
    setCurrentIndex(0)
    setUserInput('')
    setChecked(false)
    setAnswers(new Array(built.length).fill(null))
  }, [])

  const stop = useCallback(() => {
    setGivenUpWord(null)
    setQuestions([])
    setCurrentIndex(0)
    setUserInput('')
    setChecked(false)
    setAnswers([])
  }, [])

  const checkAnswer = useCallback(() => {
    const question = questions[currentIndex]
    if (checked || !question || !userInput.trim()) return
    onPractice?.(mode)
    const correct = userInput.trim().toLowerCase() === question.word.trim().toLowerCase()
    setAnswers(prev => prev.map((a, i) => i === currentIndex ? correct : a))
    setChecked(true)
  }, [checked, questions, currentIndex, userInput, onPractice, mode])

  const advance = useCallback((wasCorrect: boolean | null) => {
    const answeredIndex = currentIndex
    setChecked(false)
    setUserInput('')
    setCurrentIndex(prev => prev + 1)

    if (wasCorrect === false) {
      const gap = randomRequeueGap()
      setQuestions(prev => insertLater(prev, answeredIndex, gap, prev[answeredIndex]))
      setAnswers(prev => insertLater(prev, answeredIndex, gap, null))
    }
  }, [currentIndex])

  const nextQuestion = useCallback(() => {
    setGivenUpWord(null)
    advance(answers[currentIndex])
  }, [advance, answers, currentIndex])

  const giveUp = useCallback(() => {
    const question = questions[currentIndex]
    if (!question || checked) return
    onPractice?.(mode)
    setGivenUpWord(question.word)
    setAnswers(prev => prev.map((a, i) => i === currentIndex ? false : a))
    advance(false)
  }, [questions, currentIndex, checked, onPractice, mode, advance])

  const skipPhrase = useCallback(() => {
    const question = questions[currentIndex]
    if (!question) return
    // Keep completed history, but remove every remaining meaning/direction/retry.
    const keep = questions.map((q, i) => i < currentIndex || q.phraseId !== question.phraseId)
    setQuestions(prev => prev.filter((_, i) => keep[i]))
    setAnswers(prev => prev.filter((_, i) => keep[i]))
    setUserInput('')
    setChecked(false)
    setGivenUpWord(null)
  }, [questions, currentIndex])

  const reveal = useCallback(() => {
    if (questions[currentIndex]) setChecked(true)
  }, [questions, currentIndex])

  const markAndNext = useCallback((correct: boolean) => {
    if (!checked) return
    onPractice?.(mode)
    setAnswers(prev => prev.map((a, i) => i === currentIndex ? correct : a))
    advance(correct)
  }, [checked, onPractice, mode, currentIndex, advance])

  const jumpTo = (index: number) => {
    if (index < 0 || index >= questions.length) return
    setCurrentIndex(index)
    setGivenUpWord(null)
    setUserInput('')
    setChecked(false)
  }

  const restart = () => {
    setGivenUpWord(null)
    setCurrentIndex(0)
    setUserInput('')
    setChecked(false)
    setAnswers(prev => prev.map(() => null))
  }

  return {
    mode, reversed, questions, currentIndex, userInput, setUserInput, checked, answers, score,
    start, stop, checkAnswer, nextQuestion, reveal, markAndNext, jumpTo, restart,
    giveUp, skipPhrase, givenUpWord,
  }
}
