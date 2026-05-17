import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { chatRequest } from '../lib/apiClient'

export function useWords(selectedModel: string) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [wordsLoaded, setWordsLoaded] = useState(false)
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set())

  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newExamples, setNewExamples] = useState<string[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(true)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [editExamples, setEditExamples] = useState<string[]>([])
  const [editLoading, setEditLoading] = useState(false)

  const [aiExamplesLoading, setAiExamplesLoading] = useState(false)
  const [aiTranslationLoading, setAiTranslationLoading] = useState(false)

  const loadWords = useCallback((force = false) => {
    if ((!force && wordsLoaded) || wordsLoading) return
    setWordsLoading(true)
    setWordsError(null)
    fetch('/api/words')
      .then(res => {
        if (!res.ok) throw new Error('Kon de fraselijst niet laden')
        return res.json()
      })
      .then((data: WordEntry[]) => {
        setWords(data)
        setWordsLoaded(true)
        setWordsLoading(false)
      })
      .catch((err: Error) => {
        setWordsError(err.message)
        setWordsLoading(false)
      })
  }, [wordsLoaded, wordsLoading])

  const handleAddWord = () => {
    if (!newWord.trim() || !newTranslation.trim()) return
    setAddLoading(true)
    setAddError(null)
    fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord, translation: newTranslation, examples: newExamples.filter(e => e.trim()) }),
    })
      .then(res => {
        if (res.status === 401) throw new Error('Login om woord toe te voegen')
        if (!res.ok) throw new Error('Kon woord niet toevoegen')
        setNewWord('')
        setNewTranslation('')
        setNewExamples([])
        setShowAddForm(false)
        loadWords(true)
      })
      .catch((err: Error) => setAddError(err.message))
      .finally(() => setAddLoading(false))
  }

  const handleDeleteWord = (id: string) => {
    setDeleteLoading(true)
    fetch('/api/words', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet verwijderen')
        setDeleteConfirmId(null)
        loadWords(true)
      })
      .catch((err: Error) => {
        console.error('[handleDeleteWord]', err.message)
        setDeleteConfirmId(null)
      })
      .finally(() => setDeleteLoading(false))
  }

  const startEdit = (entry: WordEntry) => {
    setEditId(entry.id)
    setEditWord(entry.word)
    setEditTranslation(entry.translation)
    setEditExamples([...entry.examples])
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditWord('')
    setEditTranslation('')
    setEditExamples([])
  }

  const handleEditWord = () => {
    if (!editId || !editWord.trim() || !editTranslation.trim()) return
    setEditLoading(true)
    fetch('/api/words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, word: editWord, translation: editTranslation, examples: editExamples.filter(e => e.trim()) }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet bijwerken')
        cancelEdit()
        loadWords(true)
      })
      .catch((err: Error) => console.error('[handleEditWord]', err.message))
      .finally(() => setEditLoading(false))
  }

  const generateAiTranslation = (word: string, target: 'add' | 'edit') => {
    if (!word.trim()) return
    setAiTranslationLoading(true)
    const prompt = `Translate the following Dutch word or phrase into English. Return ONLY the English translation, nothing else: "${word}"`
    chatRequest(word, prompt, selectedModel)
      .then(data => {
        const translation = (data.response || '').trim()
        if (translation) {
          if (target === 'add') {
            setNewTranslation(translation)
          } else {
            setEditTranslation(translation)
          }
        }
      })
      .catch(err => console.error('[generateAiTranslation]', err))
      .finally(() => setAiTranslationLoading(false))
  }

  const generateAiExamples = (word: string, target: 'add' | 'edit') => {
    if (!word.trim()) return
    setAiExamplesLoading(true)
    const prompt = `Generate 3 natural Dutch example sentences using the word or phrase "${word}". For each sentence, provide the Dutch sentence followed by " — " (space em-dash space) and the English translation. Return ONLY the sentences, one per line, no numbering, no extra text.`
    chatRequest(word, prompt, selectedModel)
      .then(data => {
        const lines = (data.response || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
        if (target === 'add') {
          setNewExamples(prev => [...prev, ...lines])
        } else {
          setEditExamples(prev => [...prev, ...lines])
        }
      })
      .catch(err => console.error('[generateAiExamples]', err))
      .finally(() => setAiExamplesLoading(false))
  }

  const toggleExamples = (id: string) => {
    setExpandedWords(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return {
    words,
    wordsLoading, wordsError,
    expandedWords,
    newWord, setNewWord,
    newTranslation, setNewTranslation,
    newExamples, setNewExamples,
    addLoading, addError,
    showAddForm, setShowAddForm,
    deleteConfirmId, setDeleteConfirmId,
    deleteLoading,
    editId,
    editWord, setEditWord,
    editTranslation, setEditTranslation,
    editExamples, setEditExamples,
    editLoading,
    aiExamplesLoading,
    aiTranslationLoading,
    loadWords,
    handleAddWord,
    handleDeleteWord,
    startEdit,
    cancelEdit,
    handleEditWord,
    generateAiExamples,
    generateAiTranslation,
    toggleExamples,
  }
}
