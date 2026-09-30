import { useState, useCallback } from 'react'
import type { QuizFile, QuizPair, WordEntry } from '../types'
import { shuffleArray } from '../lib/shuffle'
import { buildQuizPairsFromWords } from '../lib/wordQuiz'

// A synthetic "file" id for reviewing Fraselijst directly, so it can reuse
// the exact same selectedFile/pairs flow as a real Drive quiz file.
export const FRASELIJST_SOURCE_ID = '__fraselijst__'

export function useQuiz(onPractice?: () => void) {
  const [files, setFiles] = useState<QuizFile[]>([])
  const [folderName, setFolderName] = useState<string | undefined>(undefined)
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [pageToken, setPageToken] = useState<string | undefined>(undefined)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [pageTokenStack, setPageTokenStack] = useState<(string | undefined)[]>([])

  const [selectedFile, setSelectedFile] = useState<QuizFile | null>(null)
  const [pairs, setPairs] = useState<QuizPair[]>([])
  const [pairsLoading, setPairsLoading] = useState(false)
  const [pairsError, setPairsError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<(boolean | null)[]>([])

  const [preparedFileIds, setPreparedFileIds] = useState<Set<string>>(new Set())
  const [preparedLoaded, setPreparedLoaded] = useState(false)

  // Derived from answers, not tracked separately — this way jumping back to an
  // already-answered question and re-marking it updates the score correctly
  // instead of double-counting.
  const score = {
    correct: answers.filter((a) => a === true).length,
    incorrect: answers.filter((a) => a === false).length,
  }

  const fetchFilesPage = useCallback((token: string | undefined) => {
    setFilesLoading(true)
    setFilesError(null)
    const url = token ? `/api/quiz/files?pageToken=${encodeURIComponent(token)}` : '/api/quiz/files'
    fetch(url)
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Kon bestandenlijst niet laden.') })
        return res.json()
      })
      .then((data: { files: QuizFile[]; nextPageToken?: string; folderName?: string }) => {
        setFiles(data.files)
        setNextPageToken(data.nextPageToken)
        setPageToken(token)
        setFilesLoaded(true)
        if (data.folderName) setFolderName(data.folderName)
      })
      .catch((err: Error) => {
        console.error('[useQuiz]', err.message)
        setFilesError(err.message)
      })
      .finally(() => setFilesLoading(false))
  }, [])

  const loadFiles = useCallback((force = false) => {
    if ((!force && filesLoaded) || filesLoading) return
    setPageTokenStack([])
    fetchFilesPage(undefined)
  }, [filesLoaded, filesLoading, fetchFilesPage])

  const nextFilesPage = useCallback(() => {
    if (!nextPageToken || filesLoading) return
    setPageTokenStack(prev => [...prev, pageToken])
    fetchFilesPage(nextPageToken)
  }, [nextPageToken, pageToken, filesLoading, fetchFilesPage])

  const prevFilesPage = useCallback(() => {
    if (pageTokenStack.length === 0 || filesLoading) return
    const stack = [...pageTokenStack]
    const prevToken = stack.pop()
    setPageTokenStack(stack)
    fetchFilesPage(prevToken)
  }, [pageTokenStack, filesLoading, fetchFilesPage])

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

  const selectFraselijst = (words: WordEntry[]) => {
    const pairs = shuffleArray(buildQuizPairsFromWords(words))
    setSelectedFile({ id: FRASELIJST_SOURCE_ID, name: 'Fraselijst' })
    setPairs(pairs)
    setPairsLoading(false)
    setPairsError(pairs.length === 0 ? 'Geen frasen met een betekenis gevonden. Voeg eerst frases toe in de Fraselijst.' : null)
    setCurrentIndex(0)
    setRevealed(false)
    setAnswers(new Array(pairs.length).fill(null))
  }

  const loadPreparedFileIds = useCallback((force = false) => {
    if (!force && preparedLoaded) return
    setPreparedLoaded(true)
    fetch('/api/quiz/prepared')
      .then(res => {
        if (!res.ok) throw new Error('Kon voorbereide bestanden niet laden.')
        return res.json()
      })
      .then((data: { fileIds: string[] }) => setPreparedFileIds(new Set(data.fileIds)))
      .catch(err => console.error('[useQuiz]', err instanceof Error ? err.message : err))
  }, [preparedLoaded])

  const toggleFilePrepared = (fileId: string) => {
    const isPrepared = preparedFileIds.has(fileId)
    setPreparedFileIds(prev => {
      const next = new Set(prev)
      isPrepared ? next.delete(fileId) : next.add(fileId)
      return next
    })
    fetch('/api/quiz/prepared', {
      method: isPrepared ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    }).catch(err => console.error('[useQuiz] Failed to save prepared state —', err))
  }

  const backToFiles = () => {
    setSelectedFile(null)
    setPairs([])
    setPairsError(null)
    setAnswers([])
  }

  const reveal = () => setRevealed(true)

  const markAndNext = (correct: boolean) => {
    onPractice?.()
    const answeredIndex = currentIndex
    setRevealed(false)
    setCurrentIndex(prev => prev + 1)

    if (correct) {
      setAnswers(prev => prev.map((a, i) => i === answeredIndex ? true : a))
      return
    }

    // Wrong answer: don't just mark it — requeue the same exercise a few
    // questions later (2-5 others in between) instead of a separate retry round.
    const gap = 2 + Math.floor(Math.random() * 4)
    setPairs(prev => {
      const insertAt = Math.min(answeredIndex + 1 + gap, prev.length)
      return [...prev.slice(0, insertAt), prev[answeredIndex], ...prev.slice(insertAt)]
    })
    setAnswers(prev => {
      const marked = prev.map((a, i) => i === answeredIndex ? false : a)
      const insertAt = Math.min(answeredIndex + 1 + gap, marked.length)
      return [...marked.slice(0, insertAt), null, ...marked.slice(insertAt)]
    })
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
    files, folderName, filesLoading, filesError,
    hasNextPage: !!nextPageToken, hasPrevPage: pageTokenStack.length > 0,
    selectedFile, pairs, pairsLoading, pairsError,
    currentIndex, revealed, score, answers,
    preparedFileIds, loadPreparedFileIds, toggleFilePrepared,
    loadFiles, selectFile, selectFraselijst, backToFiles,
    nextFilesPage, prevFilesPage,
    reveal, markAndNext, jumpTo, restart,
  }
}
