import { useState, useCallback } from 'react'
import type { WordEntry } from '../types'
import { chatRequest } from '../lib/apiClient'

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
  const fetchPromptFor = useCallback((phrase: WordEntry): Promise<string> => {
    // Ground the generated situation in the phrase's own translation/examples,
    // not just the bare Dutch text — some phrases are idiomatic or ambiguous,
    // and without this the AI can guess a different (often literal) meaning
    // than the one the user actually saved.
    const context = [
      `Bedoelde betekenis (vertaling): "${phrase.translation}"`,
      phrase.examples.length > 0
        ? `Voorbeeldzinnen die de bedoelde betekenis/context tonen:\n${phrase.examples.map(e => `- ${e}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `Je helpt een gebruiker om Nederlandse frasen te leren.
Genereer één korte, alledaagse vraag of opmerking in het Nederlands,
waardoor het antwoord heel natuurlijk de volgende frase zou bevatten: "${phrase.word}".
${context}
Gebruik de vertaling en voorbeelden hierboven om de JUISTE bedoelde betekenis van de frase te bepalen,
en zorg dat de situatie daar specifiek bij past — niet bij een andere (bijv. letterlijke) betekenis.
De vraag of opmerking mag de frase zelf NIET bevatten.
Geef alleen de vraag of opmerking terug, zonder uitleg of aanhalingstekens.`
    return chatRequest(phrase.word, systemPrompt, selectedModel)
      .then(data => data.response || data.error || 'Er is een fout opgetreden')
      .catch(err => {
        console.error(`[${logTag}] Failed to generate prompt —`, err instanceof Error ? err.message : err)
        return 'Kon geen vraag genereren. Probeer opnieuw.'
      })
  }, [selectedModel, logTag])

  const generatePrompt = useCallback((phrase: WordEntry) => {
    setPromptLoading(true)
    setPrompt('')
    fetchPromptFor(phrase).then(text => {
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

  const submitAnswer = useCallback((phrase: WordEntry) => {
    if (!userAnswer.trim() || !prompt) return
    onPractice?.()
    setEvaluationLoading(true)
    setEvaluation('')
    const systemPrompt = `Je evalueert een Nederlands antwoord van een taalstudent.
Het scenario was: "${prompt}"
De frase die de student moest gebruiken: "${phrase.word}"
Evalueer en corrigeer mijn antwoord met dit exacte formaat:
Evaluatie: ...
Suggestie: ...`
    chatRequest(userAnswer, systemPrompt, selectedModel)
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
