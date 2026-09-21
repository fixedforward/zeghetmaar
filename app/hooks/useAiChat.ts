import { useState, useCallback } from 'react'
import type { SelectionPopup } from '../types'
import { chatRequest } from '../lib/apiClient'
import { REWRITE_DUTCH_SENTENCE_PROMPT, TRANSLATE_TO_DUTCH_PROMPT, EXPLAIN_SELECTION_PROMPT } from '../lib/prompts'

export function useAiChat(selectedModel: string) {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [englishInput, setEnglishInput] = useState('')
  const [translationResult, setTranslationResult] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null)

  const sendRequest = useCallback((text: string) => {
    setIsLoading(true)
    setResponse('')
    chatRequest(text, REWRITE_DUTCH_SENTENCE_PROMPT, selectedModel)
      .then(data => {
        setResponse(data.response || data.error || 'Error occurred')
        setIsLoading(false)
      })
      .catch(err => {
        console.error('[sendRequest] Failed to reach /api/chat —', err instanceof Error ? err.message : err)
        setResponse('Could not reach the server. Please try again.')
        setIsLoading(false)
      })
  }, [selectedModel])

  const handleSubmit = () => {
    if (!input.trim()) return
    sendRequest(input)
  }

  const handleRefresh = () => {
    if (!input.trim() || isLoading) return
    sendRequest(input)
  }

  const capitalizeFirstLetter = (str: string) =>
    str.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

  const handleInputChange = (value: string) => {
    setInput(capitalizeFirstLetter(value))
  }

  const handleTranslate = () => {
    if (!englishInput.trim() || isTranslating) return
    setIsTranslating(true)
    setTranslationResult('')
    chatRequest(englishInput, TRANSLATE_TO_DUTCH_PROMPT, selectedModel)
      .then(data => {
        setTranslationResult(data.response || data.error || 'Er is een fout opgetreden')
        setIsTranslating(false)
      })
      .catch(() => {
        console.error('[handleTranslate] Failed to reach /api/chat')
        setTranslationResult('Could not reach the server. Please try again.')
        setIsTranslating(false)
      })
  }

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    const selected = window.getSelection()?.toString().trim()
    if (!selected) {
      setSelectionPopup(null)
      return
    }
    setSelectionPopup({ x: e.clientX, y: e.clientY + 12, text: selected, explanation: null, loading: true })
    chatRequest(selected, EXPLAIN_SELECTION_PROMPT, selectedModel)
      .then(data => {
        setSelectionPopup(prev => prev ? { ...prev, explanation: data.response || data.error || 'Geen uitleg gevonden', loading: false } : null)
      })
      .catch(() => {
        console.error('[handleTextSelection] Failed to reach /api/chat')
        setSelectionPopup(prev => prev ? { ...prev, explanation: 'Could not reach the server. Please try again.', loading: false } : null)
      })
  }, [selectedModel])

  return {
    input, setInput,
    response,
    isLoading,
    englishInput, setEnglishInput,
    translationResult,
    isTranslating,
    selectionPopup, setSelectionPopup,
    handleSubmit,
    handleRefresh,
    handleInputChange,
    handleTranslate,
    handleTextSelection,
  }
}
