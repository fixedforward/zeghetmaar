import { useEffect } from 'react'
import type { usePhrasePractice } from '../hooks/usePhrasePractice'

import { parseEvaluation } from '../lib/parseEvaluation'

import { buildChatGptCheckAnswerUrl } from '../lib/chatgpt'

type Props = ReturnType<typeof usePhrasePractice>

export function PracticeModal(props: Props) {
  const { isOpen, currentPhrase, prompt, promptLoading, userAnswer, setUserAnswer, evaluation, evaluationLoading, close, regeneratePrompt, submitAnswer } = props

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen || !currentPhrase) return null

  const parsed = evaluation ? parseEvaluation(evaluation) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold text-gray-900">Oefen: <span className="text-blue-600">{currentPhrase.word}</span></h2>
            {currentPhrase.translation && (
              <p className="text-xs text-gray-500 mt-0.5">{currentPhrase.translation}</p>
            )}
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Situatie</span>
            <button
              onClick={regeneratePrompt}
              disabled={promptLoading}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {promptLoading ? 'Laden...' : '↺ Nieuwe vraag'}
            </button>
          </div>
          {promptLoading
            ? <p className="text-sm text-gray-400 italic">Laden...</p>
            : <p className="text-sm text-gray-800 bg-gray-50 border rounded p-3">{prompt}</p>
          }
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Jouw antwoord</label>
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            rows={3}
            placeholder={`Gebruik de frase "${currentPhrase.word}" in je antwoord…`}
            className="w-full p-2 border rounded text-sm resize-none"
            disabled={evaluationLoading}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={submitAnswer}
              disabled={evaluationLoading || !userAnswer.trim() || promptLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              {evaluationLoading ? 'Evalueren...' : 'Verzenden'}
            </button>
            <button
              type="button"
              onClick={() => window.open(buildChatGptCheckAnswerUrl(currentPhrase.word, prompt, userAnswer), '_blank', 'noopener,noreferrer')}
              disabled={!userAnswer.trim() || promptLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Controleer in ChatGPT
            </button>
          </div>
        </div>

        {evaluation && (
          <div className="space-y-3 border-t pt-4">
            {parsed ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Evaluatie</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{parsed.evaluatie}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suggestie</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{parsed.suggestie}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{evaluation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
