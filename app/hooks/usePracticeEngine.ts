import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { chatRequest } from '../lib/apiClient'
import { practiceScenarioPrompt, evaluateAnswerPrompt } from '../lib/prompts'

/**
 * Shared prompt-generation + answer-evaluation logic for a single phrase,
 * used by both the one-off practice modal and the multi-phrase oefensessie.
 */
export function usePracticeEngine(selectedModel: string, logTag: string, onPractice?: () => void) {
  const [prompt, setPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [evaluationLoading, setEvaluationLoading] = useState(false)

  // Raw fetch with no component state side effects, so it can also be used to
  // prefetch prompts for phrases that aren't the currently displayed one.
  const fetchPromptFor = useCallback((phrase: WordEntry, extraWords: WordEntry[] = []): Promise<string> => {
    return chatRequest(phrase.word, practiceScenarioPrompt(phrase, extraWords), selectedModel)
      .then(data => data.response || data.error || 'Er is een fout opgetreden')
      .catch(err => {
        console.error(`[${logTag}] Failed to generate prompt —`, err instanceof Error ? err.message : err)
        return 'Kon geen vraag genereren. Probeer opnieuw.'
      })
  }, [selectedModel, logTag])

  const generatePrompt = useCallback((phrase: WordEntry, extraWords: WordEntry[] = []) => {
    setPromptLoading(true)
    setPrompt('')
    fetchPromptFor(phrase, extraWords).then(text => {
      setPrompt(text)
      setPromptLoading(false)
    })
  }, [fetchPromptFor])

  // Lets a cache-aware caller (the Oefensessie prompt cache) show an
  // already-fetched prompt instantly, without a network call or loading spinner.
  const setPromptImmediate = useCallback((text: string) => {
    setPrompt(text)
    setPromptLoading(false)
  }, [])

  const beginPromptLoading = useCallback(() => {
    setPrompt('')
    setPromptLoading(true)
  }, [])

  const submitAnswer = useCallback((phrase: WordEntry, extraWords: WordEntry[] = []) => {
    if (!userAnswer.trim() || !prompt) return
    onPractice?.()
    setEvaluationLoading(true)
    setEvaluation('')
    chatRequest(userAnswer, evaluateAnswerPrompt(prompt, phrase.word, extraWords), selectedModel)
      .then(data => {
        setEvaluation(data.response || data.error || 'Er is een fout opgetreden')
        setEvaluationLoading(false)
      })
      .catch(err => {
        console.error(`[${logTag}] Failed to evaluate answer —`, err instanceof Error ? err.message : err)
        setEvaluation('Kon het antwoord niet evalueren. Probeer opnieuw.')
        setEvaluationLoading(false)
      })
  }, [userAnswer, prompt, selectedModel, logTag, onPractice])

  const reset = useCallback(() => {
    setPrompt('')
    setPromptLoading(false)
    setUserAnswer('')
    setEvaluation('')
    setEvaluationLoading(false)
  }, [])

  const resetAnswer = useCallback(() => {
    setUserAnswer('')
    setEvaluation('')
  }, [])

  return {
    prompt,
    promptLoading,
    userAnswer,
    setUserAnswer,
    evaluation,
    evaluationLoading,
    generatePrompt,
    fetchPromptFor,
    setPromptImmediate,
    beginPromptLoading,
    submitAnswer,
    reset,
    resetAnswer,
  }
}
