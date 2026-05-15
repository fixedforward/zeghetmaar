import { useState, useCallback } from 'react'
import type { SelectionPopup } from '../types'
import { chatRequest } from '../lib/apiClient'

const DEFAULT_PROMPT = `When the user types a Dutch sentence or sentences:
1. Try to guess what it is trying to say in English and respond with: "Seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest an alternative Dutch sentence, if applicable`

export function useAiChat(selectedModel: string) {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCached, setIsCached] = useState(false)

  const [englishInput, setEnglishInput] = useState('')
  const [translationResult, setTranslationResult] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null)

  const sendRequest = useCallback((text: string) => {
    setIsLoading(true)
    setResponse('')
    setIsCached(false)
    chatRequest(text, DEFAULT_PROMPT, selectedModel)
      .then(data => {
        setResponse(data.response || data.error || 'Error occurred')
        setIsCached(data.cached || false)
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
    const translatePrompt = 'Give 2 or 3 different natural ways to say the following English sentence in Dutch. Number each option and briefly note any difference in tone or formality if relevant. Reply only with the Dutch options, no extra explanation.'
    chatRequest(englishInput, translatePrompt, selectedModel)
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
    const explainPrompt = 'The user is learning Dutch. They highlighted the following word or phrase and want to know what it means. Give a short, clear explanation in English: what it means, and (if it is Dutch) how it is typically used. Keep it to 2-3 sentences max.'
    chatRequest(selected, explainPrompt, selectedModel)
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
    isCached,
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
