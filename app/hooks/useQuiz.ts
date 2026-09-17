import { useState, useCallback } from 'react'
import type { QuizFile, QuizPair } from '../types'
import { shuffleArray } from '../lib/shuffle'

export function useQuiz() {
  const [files, setFiles] = useState<QuizFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [filesLoaded, setFilesLoaded] = useState(false)

  const [selectedFile, setSelectedFile] = useState<QuizFile | null>(null)
  const [pairs, setPairs] = useState<QuizPair[]>([])
  const [pairsLoading, setPairsLoading] = useState(false)
  const [pairsError, setPairsError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<(boolean | null)[]>([])

  // Derived from answers, not tracked separately — this way jumping back to an
  // already-answered question and re-marking it updates the score correctly
  // instead of double-counting.
  const score = {
    correct: answers.filter((a) => a === true).length,
    incorrect: answers.filter((a) => a === false).length,
  }

  const loadFiles = useCallback((force = false) => {
    if ((!force && filesLoaded) || filesLoading) return
    setFilesLoading(true)
    setFilesError(null)
    fetch('/api/quiz/files')
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Kon bestandenlijst niet laden.') })
        return res.json()
      })
      .then((data: QuizFile[]) => {
        setFiles(data)
        setFilesLoaded(true)
      })
      .catch((err: Error) => {
        console.error('[useQuiz]', err.message)
        setFilesError(err.message)
      })
      .finally(() => setFilesLoading(false))
  }, [filesLoaded, filesLoading])

  const selectFile = (file: QuizFile) => {
    setSelectedFile(file)
    setPairs([])
    setPairsLoading(true)
    setPairsError(null)
    setCurrentIndex(0)
    setRevealed(false)
    setAnswers([])
    fetch(`/api/quiz/files/${file.id}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Kon quizbestand niet laden.') })
        return res.json()
      })
      .then((data: QuizPair[]) => {
        setPairs(shuffleArray(data))
        setAnswers(new Array(data.length).fill(null))
      })
      .catch((err: Error) => {
        console.error('[useQuiz]', err.message)
        setPairsError(err.message)
      })
      .finally(() => setPairsLoading(false))
  }

  const backToFiles = () => {
    setSelectedFile(null)
    setPairs([])
    setPairsError(null)
    setAnswers([])
  }

  const reveal = () => setRevealed(true)

  const markAndNext = (correct: boolean) => {
    setAnswers(prev => prev.map((a, i) => i === currentIndex ? correct : a))
    setRevealed(false)
    setCurrentIndex(prev => prev + 1)
  }

  const jumpTo = (index: number) => {
    if (index < 0 || index >= pairs.length) return
    setCurrentIndex(index)
    setRevealed(false)
  }

  const restart = () => {
    setCurrentIndex(0)
    setRevealed(false)
    setAnswers(prev => prev.map(() => null))
  }

  return {
    files, filesLoading, filesError,
    selectedFile, pairs, pairsLoading, pairsError,
    currentIndex, revealed, score, answers,
    loadFiles, selectFile, backToFiles,
    reveal, markAndNext, jumpTo, restart,
  }
}
