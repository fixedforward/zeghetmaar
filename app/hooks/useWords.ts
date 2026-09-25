import { useState, useCallback } from 'react'
import type { WordEntry, Meaning } from '../types'
import { chatRequest } from '../lib/apiClient'
import { translateWordPrompt, generateExamplePrompt } from '../lib/prompts'

const EMPTY_MEANING: Meaning = { translation: '', examples: [] }

export function useWords(selectedModel: string) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [wordsLoaded, setWordsLoaded] = useState(false)

  const [newWord, setNewWord] = useState('')
  const [newMeanings, setNewMeanings] = useState<Meaning[]>([EMPTY_MEANING])
  const [newTags, setNewTags] = useState<string[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(true)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editMeanings, setEditMeanings] = useState<Meaning[]>([])
  const [editTags, setEditTags] = useState<string[]>([])
  const [editLoading, setEditLoading] = useState(false)

  const [aiExamplesLoading, setAiExamplesLoading] = useState(false)
  const [aiTranslationLoading, setAiTranslationLoading] = useState(false)
  const [beheersingLoadingId, setBeheersingLoadingId] = useState<string | null>(null)
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null)

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
    const meanings = newMeanings
      .map(m => ({ translation: m.translation.trim(), examples: m.examples.map(e => e.trim()).filter(Boolean) }))
      .filter(m => m.translation)
    if (!newWord.trim() || meanings.length === 0) return
    setAddLoading(true)
    setAddError(null)
    fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: newWord,
        meanings,
        tags: newTags,
      }),
    })
      .then(res => {
        if (res.status === 401) throw new Error('Login om frase toe te voegen')
        if (!res.ok) throw new Error('Kon frase niet toevoegen')
        setNewWord('')
        setNewMeanings([EMPTY_MEANING])
        setNewTags([])
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
    setEditMeanings(entry.meanings.map(m => ({ translation: m.translation, examples: [...m.examples] })))
    setEditTags(entry.tags ?? [])
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditWord('')
    setEditMeanings([])
    setEditTags([])
  }

  const handleEditWord = () => {
    const meanings = editMeanings
      .map(m => ({ translation: m.translation.trim(), examples: m.examples.map(e => e.trim()).filter(Boolean) }))
      .filter(m => m.translation)
    if (!editId || !editWord.trim() || meanings.length === 0) return
    setEditLoading(true)
    fetch('/api/words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editId,
        word: editWord,
        meanings,
        tags: editTags,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet bijwerken')
        cancelEdit()
        loadWords(true)
      })
      .catch((err: Error) => console.error('[handleEditWord]', err.message))
      .finally(() => setEditLoading(false))
  }

  const generateAiTranslation = (word: string, target: 'add' | 'edit', index: number) => {
    if (!word.trim()) return
    setAiTranslationLoading(true)
    chatRequest(word, translateWordPrompt(word), selectedModel)
      .then(data => {
        const translation = (data.response || '').trim()
        if (!translation) return
        const setMeanings = target === 'add' ? setNewMeanings : setEditMeanings
        setMeanings(prev => prev.map((m, i) => i === index ? { ...m, translation } : m))
      })
      .catch(err => console.error('[generateAiTranslation]', err))
      .finally(() => setAiTranslationLoading(false))
  }

  const generateAiExamples = (word: string, target: 'add' | 'edit', index: number) => {
    if (!word.trim()) return
    setAiExamplesLoading(true)
    chatRequest(word, generateExamplePrompt(word), selectedModel)
      .then(data => {
        const lines = (data.response || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
        const setMeanings = target === 'add' ? setNewMeanings : setEditMeanings
        setMeanings(prev => prev.map((m, i) => i === index ? { ...m, examples: [...m.examples, ...lines] } : m))
      })
      .catch(err => console.error('[generateAiExamples]', err))
      .finally(() => setAiExamplesLoading(false))
  }

  const setBeheersing = (id: string, value: 1 | 2 | 3) => {
    setBeheersingLoadingId(id)
    fetch('/api/words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, beheersing: value }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon beheersing niet opslaan')
        setWords(prev => prev.map(w => w.id === id ? { ...w, beheersing: value } : w))
      })
      .catch(err => console.error('[setBeheersing]', err))
      .finally(() => setBeheersingLoadingId(null))
  }

  const toggleFavorite = (id: string, current: boolean) => {
    setFavoriteLoadingId(id)
    fetch('/api/words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isFavorite: !current }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon favoriet niet opslaan')
        setWords(prev => prev.map(w => w.id === id ? { ...w, isFavorite: !current } : w))
      })
      .catch(err => console.error('[toggleFavorite]', err))
      .finally(() => setFavoriteLoadingId(null))
  }

  return {
    words,
    wordsLoading, wordsError,
    newWord, setNewWord,
    newMeanings, setNewMeanings,
    newTags, setNewTags,
    addLoading, addError,
    showAddForm, setShowAddForm,
    deleteConfirmId, setDeleteConfirmId,
    deleteLoading,
    editId,
    editWord, setEditWord,
    editMeanings, setEditMeanings,
    editTags, setEditTags,
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
    setBeheersing,
    beheersingLoadingId,
    toggleFavorite,
    favoriteLoadingId,
  }
}
