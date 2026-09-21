import { useEffect, useState } from 'react'
import type { useOefenSessie } from '../hooks/useOefenSessie'
import { OEFENSESSIE_SIZE } from '../hooks/useOefenSessie'
import type { useWords } from '../hooks/useWords'
import { parseEvaluation } from '../lib/parseEvaluation'
import { buildChatGptCheckAnswerUrl, openChatGptInBackground } from '../lib/chatgpt'
import { getAllTags } from '../lib/tags'
import { PracticeCounter } from './PracticeCounter'
import { PhraseDetailModal } from './PhraseDetailModal'

type Props = ReturnType<typeof useOefenSessie> & ReturnType<typeof useWords> & {
  isLoggedIn: boolean
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
}

export function OefenSessieTab(props: Props) {
  const {
    words, wordsLoading, wordsError, isLoggedIn, practicedDates, onCheckIn, onCancelCheckIn,
    startEdit,
    previewPhrases, refreshPreview,
    sessionPhrases, currentIndex, currentPhrase, isActive, isFinished,
    extraWords,
    prompt, promptLoading, userAnswer, setUserAnswer, evaluation, evaluationLoading,
    startSession, stopSession, regeneratePrompt, previousPhrase, nextPhrase, submitAnswer,
  } = props

  const parsed = evaluation ? parseEvaluation(evaluation) : null

  const [activeTag, setActiveTag] = useState<string | null>(null)
  const allTags = getAllTags(words)
  const filteredWords = activeTag ? words.filter(w => w.tags?.includes(activeTag)) : words

  const selectTag = (tag: string | null) => {
    setActiveTag(tag)
    refreshPreview(tag ? words.filter(w => w.tags?.includes(tag)) : words)
  }

  useEffect(() => {
    if (!isActive && previewPhrases.length === 0 && words.length > 0) refreshPreview(words)
  }, [isActive, previewPhrases.length, words, refreshPreview])

  if (!isActive) {
    return (
      <div className="space-y-4">
        {isLoggedIn && <PracticeCounter practicedDates={practicedDates} onCheckIn={onCheckIn} onCancelCheckIn={onCancelCheckIn} />}
        <p className="text-sm text-gray-500">
          Kies een frase om een sessie met {OEFENSESSIE_SIZE} willekeurige frases te starten.
          Voor elke frase krijg je een situatie waarin je hem moet gebruiken, en daarna feedback op je antwoord.
        </p>
        {wordsLoading && <p className="text-sm text-gray-400 italic">Fraselijst laden...</p>}
        {wordsError && <p className="text-sm text-red-600">{wordsError}</p>}
        {!wordsLoading && !wordsError && words.length === 0 && (
          <p className="text-sm text-gray-400">Geen frasen gevonden. Voeg eerst frases toe in de Fraselijst.</p>
        )}
        {!wordsLoading && !wordsError && allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Tags:</span>
            <button
              onClick={() => selectTag(null)}
              className={[
                'text-xs px-2 py-0.5 rounded border',
                activeTag === null
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
              ].join(' ')}
            >
              Alle
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => selectTag(tag)}
                className={[
                  'text-xs px-2 py-0.5 rounded border',
                  activeTag === tag
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
                ].join(' ')}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        {!wordsLoading && !wordsError && words.length > 0 && activeTag && filteredWords.length === 0 && (
          <p className="text-sm text-gray-400">Geen frasen met tag &quot;{activeTag}&quot; gevonden.</p>
        )}
        {!wordsLoading && !wordsError && previewPhrases.length > 0 && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => refreshPreview(filteredWords)}
                className="text-xs text-blue-600 hover:underline"
              >
                ↺ Ververs met nieuwe frases
              </button>
            </div>
            <ul className="space-y-2">
              {previewPhrases.map((phrase, i) => (
                <li key={phrase.id}>
                  <button
                    onClick={() => startSession(i)}
                    className="w-full text-left border rounded p-3 bg-white hover:bg-blue-50 flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-900">{phrase.word}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="space-y-4 text-center py-8">
        {isLoggedIn && <div className="flex justify-center"><PracticeCounter practicedDates={practicedDates} onCheckIn={onCheckIn} onCancelCheckIn={onCancelCheckIn} /></div>}
        <p className="text-lg font-semibold text-gray-900">Klaar! 🎉</p>
        <p className="text-sm text-gray-600">Je hebt {sessionPhrases.length} frases geoefend.</p>
        <button
          onClick={() => { stopSession(); refreshPreview(filteredWords) }}
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
        <h2 className="font-semibold text-gray-900">
          Oefen:{' '}
          <button
            onClick={() => startEdit(currentPhrase)}
            className="text-blue-600 hover:underline"
            title={currentPhrase.translation}
          >
            {currentPhrase.word}
          </button>
        </h2>
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
        {extraWords.length > 0 && (
          <p className="text-xs text-gray-400">
            Gebruik ook: {extraWords.map((w, i) => (
              <span key={w.id}>
                {i > 0 && ', '}
                <span title={w.translation} className="underline decoration-dotted">{w.word}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Jouw antwoord</label>
        <textarea
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          rows={3}
          placeholder={
            extraWords.length > 0
              ? `Gebruik "${currentPhrase.word}", "${extraWords.map(w => w.word).join('", "')}" in je antwoord…`
              : `Gebruik de frase "${currentPhrase.word}" in je antwoord…`
          }
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
            onClick={previousPhrase}
            disabled={promptLoading || currentIndex === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            ← Vorige frase
          </button>
          <button
            onClick={nextPhrase}
            disabled={promptLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            {currentIndex + 1 === sessionPhrases.length ? 'Afronden →' : 'Volgende frase →'}
          </button>
          <button
            type="button"
            onClick={() => openChatGptInBackground(buildChatGptCheckAnswerUrl(currentPhrase.word, prompt, userAnswer, extraWords.map(w => w.word)))}
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

      <PhraseDetailModal {...props} />
    </div>
  )
}
