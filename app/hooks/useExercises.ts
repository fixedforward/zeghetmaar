import { useState, useEffect } from 'react'
import type { Exercise } from '../types'

const EXERCISES_STORAGE_KEY = 'extra-oefeningen'

const DEFAULT_EXERCISES: Exercise[] = [
  { id: '1', name: 'NT2 Taalmenu', url: 'https://www.nt2taalmenu.nl/' },
  { id: '2', name: 'Oefenen.nl', url: 'https://oefenen.nl/' },
  { id: '3', name: 'Learn Dutch with Kim', url: 'https://www.learndutchwithkim.com/' },
]

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseUrl, setNewExerciseUrl] = useState('')
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [editExerciseName, setEditExerciseName] = useState('')
  const [editExerciseUrl, setEditExerciseUrl] = useState('')
  const [deleteExerciseConfirmId, setDeleteExerciseConfirmId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXERCISES_STORAGE_KEY)
      setExercises(stored ? JSON.parse(stored) : DEFAULT_EXERCISES)
    } catch {
      setExercises(DEFAULT_EXERCISES)
    }
  }, [])

  const saveExercises = (updated: Exercise[]) => {
    setExercises(updated)
    localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(updated))
  }

  const handleAddExercise = () => {
    if (!newExerciseName.trim() || !newExerciseUrl.trim()) return
    const exercise: Exercise = { id: Date.now().toString(), name: newExerciseName.trim(), url: newExerciseUrl.trim() }
    saveExercises([...exercises, exercise])
    setNewExerciseName('')
    setNewExerciseUrl('')
    setShowAddExercise(false)
  }

  const handleEditExercise = () => {
    if (!editExerciseId || !editExerciseName.trim() || !editExerciseUrl.trim()) return
    saveExercises(exercises.map(e => e.id === editExerciseId ? { ...e, name: editExerciseName.trim(), url: editExerciseUrl.trim() } : e))
    setEditExerciseId(null)
  }

  const handleDeleteExercise = (id: string) => {
    saveExercises(exercises.filter(e => e.id !== id))
    setDeleteExerciseConfirmId(null)
  }

  const startEditExercise = (exercise: Exercise) => {
    setEditExerciseId(exercise.id)
    setEditExerciseName(exercise.name)
    setEditExerciseUrl(exercise.url)
  }

  return {
    exercises,
    showAddExercise, setShowAddExercise,
    newExerciseName, setNewExerciseName,
    newExerciseUrl, setNewExerciseUrl,
    editExerciseId, setEditExerciseId,
    editExerciseName, setEditExerciseName,
    editExerciseUrl, setEditExerciseUrl,
    deleteExerciseConfirmId, setDeleteExerciseConfirmId,
    handleAddExercise,
    handleEditExercise,
    handleDeleteExercise,
    startEditExercise,
  }
}
