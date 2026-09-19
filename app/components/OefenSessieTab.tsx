import type { WordEntry } from '../types'
import type { useOefenSessie } from '../hooks/useOefenSessie'
import { OEFENSESSIE_SIZE } from '../hooks/useOefenSessie'
import { parseEvaluation } from '../lib/parseEvaluation'

type Props = ReturnType<typeof useOefenSessie> & {
  words: WordEntry[]
  wordsLoading: boolean
  wordsError: string | null
}

export function OefenSessieTab(props: Props) {
  const {
    words, wordsLoading, wordsError,
    sessionPhrases, currentIndex, currentPhrase, isActive, isFinished,
    prompt, promptLoading, userAnswer, setUserAnswer, evaluation, evaluationLoading,
    startSession, stopSession, regeneratePrompt, nextPhrase, submitAnswer,
  } = props

  const parsed = evaluation ? parseEvaluation(evaluation) : null

  if (!isActive) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Start een sessie met {OEFENSESSIE_SIZE} willekeurige frases uit je fraselijst.
          Voor elke frase krijg je een situatie waarin je hem moet gebruiken, en daarna feedback op je antwoord.
        </p>
        {wordsLoading && <p className="text-sm text-gray-400 italic">Fraselijst laden...</p>}
        {wordsError && <p className="text-sm text-red-600">{wordsError}</p>}
        {!wordsLoading && !wordsError && words.length === 0 && (
          <p className="text-sm text-gray-400">Geen frasen gevonden. Voeg eerst frases toe in de Fraselijst.</p>
        )}
        <button
          onClick={() => startSession(words)}
          disabled={wordsLoading || words.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          Start oefensessie
        </button>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-lg font-semibold text-gray-900">Klaar! 🎉</p>
        <p className="text-sm text-gray-600">Je hebt {sessionPhrases.length} frases geoefend.</p>
        <button
          onClick={() => startSession(words)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Nieuwe sessie
        </button>
      </div>
    )
  }

  if (!currentPhrase) return null

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">Frase {currentIndex + 1} van {sessionPhrases.length}</span>
        <button onClick={stopSession} className="text-xs text-gray-400 hover:text-gray-600">✕ Stoppen</button>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900">Oefen: <span className="text-blue-600">{currentPhrase.word}</span></h2>
        {currentPhrase.translation && (
          <p className="text-xs text-gray-500 mt-0.5">{currentPhrase.translation}</p>
        )}
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
        <div className="flex gap-2">
          <button
            onClick={submitAnswer}
            disabled={evaluationLoading || !userAnswer.trim() || promptLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {evaluationLoading ? 'Evalueren...' : 'Verzenden'}
          </button>
          <button
            onClick={nextPhrase}
            disabled={promptLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            {currentIndex + 1 === sessionPhrases.length ? 'Afronden →' : 'Volgende frase →'}
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
  )
}
