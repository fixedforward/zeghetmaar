import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { buildClozeQuestions, buildFlashcards, type ClozeQuestion } from '../lib/cloze'

// 'typen' is the Clozemaster-style session (type the missing word); 'kaarten'
// is the Anki-style one (phrase on the front, flip to the meaning, self-mark Goed/Fout).
export type ClozeMode = 'typen' | 'kaarten'

export function useCloze(onPractice?: (mode: ClozeMode) => void) {
  const [mode, setMode] = useState<ClozeMode>('typen')
  const [questions, setQuestions] = useState<ClozeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState<(boolean | null)[]>([])

  // Derived from answers, not tracked separately — this way jumping back to an
  // already-answered question and re-checking it updates the score correctly
  // instead of double-counting.
  const score = {
    correct: answers.filter(a => a === true).length,
    incorrect: answers.filter(a => a === false).length,
  }

  const start = useCallback((words: WordEntry[], sessionMode: ClozeMode = 'typen') => {
    const built = shuffleArray(sessionMode === 'kaarten' ? buildFlashcards(words) : buildClozeQuestions(words))
    setMode(sessionMode)
    setQuestions(built)
    setCurrentIndex(0)
    setUserInput('')
    setChecked(false)
    setAnswers(new Array(built.length).fill(null))
  }, [])

  const stop = useCallback(() => {
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
      // Wrong answer: don't just mark it — requeue the same question a few
      // questions later (2-5 others in between) instead of a separate retry round.
      const gap = 2 + Math.floor(Math.random() * 4)
      setQuestions(prev => {
        const insertAt = Math.min(answeredIndex + 1 + gap, prev.length)
        return [...prev.slice(0, insertAt), prev[answeredIndex], ...prev.slice(insertAt)]
      })
      setAnswers(prev => {
        const insertAt = Math.min(answeredIndex + 1 + gap, prev.length)
        return [...prev.slice(0, insertAt), null, ...prev.slice(insertAt)]
      })
    }
  }, [currentIndex])

  const nextQuestion = useCallback(() => {
    advance(answers[currentIndex])
  }, [advance, answers, currentIndex])

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
    setUserInput('')
    setChecked(false)
  }

  const restart = () => {
    setCurrentIndex(0)
    setUserInput('')
    setChecked(false)
    setAnswers(prev => prev.map(() => null))
  }

  return {
    mode, questions, currentIndex, userInput, setUserInput, checked, answers, score,
    start, stop, checkAnswer, nextQuestion, reveal, markAndNext, jumpTo, restart,
  }
}
