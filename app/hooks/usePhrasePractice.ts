import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { chatRequest } from '../lib/apiClient'

export function usePhrasePractice(selectedModel: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPhrase, setCurrentPhrase] = useState<WordEntry | null>(null)
  const [prompt, setPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [evaluationLoading, setEvaluationLoading] = useState(false)

  const generatePrompt = useCallback((phrase: WordEntry) => {
    setPromptLoading(true)
    setPrompt('')
    const systemPrompt = `Je helpt een gebruiker om Nederlandse frasen te leren.
Genereer één korte, alledaagse vraag of opmerking in het Nederlands,
waardoor het antwoord heel natuurlijk de volgende frase zou bevatten: "${phrase.word}".
De vraag of opmerking mag de frase zelf NIET bevatten.
Geef alleen de vraag of opmerking terug, zonder uitleg of aanhalingstekens.`
    chatRequest(phrase.word, systemPrompt, selectedModel)
      .then(data => {
        setPrompt(data.response || data.error || 'Er is een fout opgetreden')
        setPromptLoading(false)
      })
      .catch(err => {
        console.error('[usePhrasePractice] Failed to generate prompt —', err instanceof Error ? err.message : err)
        setPrompt('Kon geen vraag genereren. Probeer opnieuw.')
        setPromptLoading(false)
      })
  }, [selectedModel])

  const open = useCallback((phrase: WordEntry) => {
    setCurrentPhrase(phrase)
    setUserAnswer('')
    setEvaluation('')
    setIsOpen(true)
    generatePrompt(phrase)
  }, [generatePrompt])

  const close = useCallback(() => {
    setIsOpen(false)
    setCurrentPhrase(null)
    setPrompt('')
    setPromptLoading(false)
    setUserAnswer('')
    setEvaluation('')
    setEvaluationLoading(false)
  }, [])

  const regeneratePrompt = useCallback(() => {
    if (!currentPhrase) return
    setEvaluation('')
    setUserAnswer('')
    generatePrompt(currentPhrase)
  }, [currentPhrase, generatePrompt])

  const submitAnswer = useCallback(() => {
    if (!currentPhrase || !userAnswer.trim() || !prompt) return
    setEvaluationLoading(true)
    setEvaluation('')
    const systemPrompt = `Je evalueert een Nederlands antwoord van een taalstudent.
Het scenario was: "${prompt}"
De frase die de student moest gebruiken: "${currentPhrase.word}"
Evalueer en corrigeer mijn antwoord met dit exacte formaat:
Evaluatie: ...
Suggestie: ...`
    chatRequest(userAnswer, systemPrompt, selectedModel)
      .then(data => {
        setEvaluation(data.response || data.error || 'Er is een fout opgetreden')
        setEvaluationLoading(false)
      })
      .catch(err => {
        console.error('[usePhrasePractice] Failed to evaluate answer —', err instanceof Error ? err.message : err)
        setEvaluation('Kon het antwoord niet evalueren. Probeer opnieuw.')
        setEvaluationLoading(false)
      })
  }, [currentPhrase, userAnswer, prompt, selectedModel])

  return {
    isOpen,
    currentPhrase,
    prompt,
    promptLoading,
    userAnswer,
    setUserAnswer,
    evaluation,
    evaluationLoading,
    open,
    close,
    regeneratePrompt,
    submitAnswer,
  }
}
