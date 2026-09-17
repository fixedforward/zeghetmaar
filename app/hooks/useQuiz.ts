import { useState, useCallback } from 'react'
import type { QuizFile, QuizPair } from '../types'

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
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })

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
    setScore({ correct: 0, incorrect: 0 })
    fetch(`/api/quiz/files/${file.id}`)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Kon quizbestand niet laden.') })
        return res.json()
      })
      .then((data: QuizPair[]) => setPairs(data))
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
  }

  const reveal = () => setRevealed(true)

  const markAndNext = (correct: boolean) => {
    setScore(prev => correct
      ? { ...prev, correct: prev.correct + 1 }
      : { ...prev, incorrect: prev.incorrect + 1 })
    setRevealed(false)
    setCurrentIndex(prev => prev + 1)
  }

  const restart = () => {
    setCurrentIndex(0)
    setRevealed(false)
    setScore({ correct: 0, incorrect: 0 })
  }

  return {
    files, filesLoading, filesError,
    selectedFile, pairs, pairsLoading, pairsError,
    currentIndex, revealed, score,
    loadFiles, selectFile, backToFiles,
    reveal, markAndNext, restart,
  }
}
