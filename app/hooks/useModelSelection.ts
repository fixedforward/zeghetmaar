import { useState, useEffect } from 'react'
import { MODELS, DEFAULT_MODEL, MODEL_STORAGE_KEY } from '../config/models'

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY)
      if (stored && MODELS.includes(stored)) setSelectedModel(stored)
    } catch {
      // ignore
    }
  }, [])

  const setModel = (model: string) => {
    setSelectedModel(model)
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, model)
    } catch {
      // ignore
    }
  }

  return { selectedModel, setModel }
}
