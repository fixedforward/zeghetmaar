import { useEffect, useState } from 'react'
import type { useQuiz } from '../hooks/useQuiz'
import type { useWords } from '../hooks/useWords'
import { buildChatGptExplainUrl, openChatGptInBackground } from '../lib/chatgpt'
import { filterWordsForQuiz } from '../lib/wordQuiz'
import { PracticeCounter } from './PracticeCounter'

type Props = ReturnType<typeof useQuiz> & ReturnType<typeof useWords> & {
  isLoggedIn: boolean
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
}

interface ChatGptLink {
  x: number
  y: number
  url: string
}

const QUIZ_NOTES_STORAGE_KEY = 'quiz-notes'

export function QuizTab(quiz: Props) {
  const [chatGptLink, setChatGptLink] = useState<ChatGptLink | null>(null)
  const [notes, setNotes] = useState('')
  const [beheersingLevels, setBeheersingLevels] = useState<Set<1 | 2 | 3>>(new Set([1, 2, 3]))
  const [recentCount, setRecentCount] = useState<number | null>(null)

  const toggleBeheersingLevel = (level: 1 | 2 | 3) => {
    setBeheersingLevels(prev => {
      if (prev.has(level) && prev.size === 1) return prev // keep at least one selected
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  const filteredWords = filterWordsForQuiz(quiz.words, { beheersingLevels, recentCount })

  useEffect(() => {
    try {
      setNotes(localStorage.getItem(QUIZ_NOTES_STORAGE_KEY) ?? '')
    } catch {
      // localStorage unavailable — notes just won't persist.
    }
  }, [])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    try {
      localStorage.setItem(QUIZ_NOTES_STORAGE_KEY, value)
    } catch {
      // localStorage unavailable — notes just won't persist.
    }
  }

  useEffect(() => {
    if (!chatGptLink) return
    const closeIfOutside = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('[data-chatgpt-link]')) setChatGptLink(null)
    }
    document.addEventListener('mousedown', closeIfOutside)
    return () => document.removeEventListener('mousedown', closeIfOutside)
  }, [chatGptLink])

  const handleTextSelection = (e: React.MouseEvent) => {
    const selected = window.getSelection()?.toString().trim()
    if (!selected) {
      setChatGptLink(null)
      return
    }
    setChatGptLink({ x: e.clientX, y: e.clientY + 12, url: buildChatGptExplainUrl(selected) })
  }

  if (!quiz.isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om de quiz te gebruiken.</p>
  }

  if (!quiz.selectedFile) {
    return (
      <div>
        <PracticeCounter practicedDates={quiz.practicedDates} onCheckIn={quiz.onCheckIn} onCancelCheckIn={quiz.onCancelCheckIn} />

        <div className="border rounded p-3 bg-white mb-4 space-y-2">
          <div className="flex justify-between items-center gap-3">
            <span className="font-medium truncate min-w-0">
              📚 Fraselijst {!quiz.wordsLoading && <span className="text-gray-400">({filteredWords.length} van {quiz.words.length} frasen)</span>}
            </span>
            <button
              onClick={() => quiz.selectFraselijst(filteredWords)}
              disabled={quiz.wordsLoading || filteredWords.length === 0}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 shrink-0"
            >
              Start
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Beheersing:</span>
            {([1, 2, 3] as const).map(n => (
              <button
                key={n}
                onClick={() => toggleBeheersingLevel(n)}
                title={`Beheersing ${n}`}
                className={[
                  'w-6 h-6 rounded text-xs font-bold transition-colors',
                  beheersingLevels.has(n)
                    ? n === 1 ? 'bg-red-400 text-white' : n === 2 ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Laatst toegevoegd:</span>
            <select
              value={recentCount ?? 'all'}
              onChange={(e) => setRecentCount(e.target.value === 'all' ? null : Number(e.target.value))}
              className="text-xs border rounded px-1.5 py-0.5 bg-white text-gray-600"
            >
              <option value="all">Alle</option>
              <option value="10">Laatste 10</option>
              <option value="20">Laatste 20</option>
              <option value="50">Laatste 50</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Of kies een bestand uit {quiz.folderName ? <>de map <span className="font-medium">{quiz.folderName}</span></> : 'de geconfigureerde map'} om jezelf te overhoren.
        </p>

        {quiz.filesLoading && <p className="text-sm text-gray-400">Bestanden laden...</p>}
        {quiz.filesError && <p className="text-sm text-red-500">{quiz.filesError}</p>}
        {!quiz.filesLoading && !quiz.filesError && quiz.files.length === 0 && (
          <p className="text-sm text-gray-400">Geen quizbestanden gevonden.</p>
        )}

        <ul className="space-y-2">
          {quiz.files.map((file) => (
            <li key={file.id} className="border rounded p-3 bg-white flex justify-between items-center gap-3">
              <span className="font-medium truncate min-w-0">{file.name}</span>
              <button
                onClick={() => quiz.selectFile(file)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0"
              >
                Start
              </button>
            </li>
          ))}
        </ul>

        {(quiz.hasPrevPage || quiz.hasNextPage) && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={quiz.prevFilesPage}
              disabled={!quiz.hasPrevPage || quiz.filesLoading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Vorige
            </button>
            <button
              onClick={quiz.nextFilesPage}
              disabled={!quiz.hasNextPage || quiz.filesLoading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Volgende →
            </button>
          </div>
        )}
      </div>
    )
  }

  if (quiz.pairsLoading) {
    return <p className="text-sm text-gray-400">Zinnen laden...</p>
  }

  if (quiz.pairsError) {
    return (
      <div>
        <p className="text-sm text-red-500 mb-4">{quiz.pairsError}</p>
        <button onClick={quiz.backToFiles} className="text-sm text-blue-600 hover:underline">
          ← Terug
        </button>
      </div>
    )
  }

  const total = quiz.pairs.length
  const done = quiz.currentIndex >= total
  const currentPhraseId = !done ? quiz.pairs[quiz.currentIndex]?.phraseId : undefined
  const currentWord = currentPhraseId ? quiz.words.find(w => w.id === currentPhraseId) : undefined

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{quiz.selectedFile.name}</span>
        <button onClick={quiz.backToFiles} className="text-sm text-blue-600 hover:underline">
          ← Terug
        </button>
      </div>

      {!done && (
        <p className="text-xs text-gray-400 mb-2">
          Tip: selecteer een woord of zin om uitleg te krijgen via ChatGPT.
        </p>
      )}

      {done ? (
        <div className="border rounded p-4 bg-white text-center space-y-3">
          <div className="flex justify-center"><PracticeCounter practicedDates={quiz.practicedDates} onCheckIn={quiz.onCheckIn} onCancelCheckIn={quiz.onCancelCheckIn} /></div>
          <p className="font-semibold">
            Klaar! {quiz.score.correct} goed, {quiz.score.incorrect} fout van {total}.
          </p>
          <button
            onClick={quiz.restart}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            Opnieuw
          </button>
        </div>
      ) : (
        <div className="border rounded p-4 bg-white space-y-4">
          <p className="text-xs text-gray-400">
            Zin {quiz.currentIndex + 1} van {total} · {quiz.score.correct} goed, {quiz.score.incorrect} fout
          </p>
          <p className="text-lg" onMouseUp={handleTextSelection}>{quiz.pairs[quiz.currentIndex].dutch}</p>

          {!quiz.revealed ? (
            <>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Antwoord..."
                rows={1}
                className="w-full text-xs border rounded p-1.5 bg-white"
              />
              <button
                onClick={quiz.reveal}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Toon antwoord
              </button>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-700 border-t pt-3" onMouseUp={handleTextSelection}>{quiz.pairs[quiz.currentIndex].english}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => quiz.markAndNext(true)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  ✓ Goed
                </button>
                <button
                  onClick={() => quiz.markAndNext(false)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  ✗ Fout
                </button>
              </div>
              {currentPhraseId && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">Beheersing:</span>
                  {([1, 2, 3] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => quiz.setBeheersing(currentPhraseId, n)}
                      disabled={quiz.beheersingLoadingId === currentPhraseId}
                      title={`Beheersing ${n}`}
                      className={[
                        'w-6 h-6 rounded text-xs font-bold transition-colors disabled:opacity-50',
                        currentWord?.beheersing === n
                          ? n === 1 ? 'bg-red-400 text-white' : n === 2 ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-1">Overzicht</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto border rounded p-2 bg-white">
          {quiz.pairs.map((pair, i) => {
            const answer = quiz.answers[i]
            const isCurrent = i === quiz.currentIndex && !done
            return (
              <li
                key={i}
                onClick={() => quiz.jumpTo(i)}
                className={`text-sm px-2 py-1 rounded flex gap-2 cursor-pointer hover:bg-gray-50 ${isCurrent ? 'bg-blue-50 border border-blue-200' : ''}`}
              >
                <span className="text-gray-400 w-6 shrink-0">{i + 1}.</span>
                <span className={answer === false ? 'text-red-600' : answer === true ? 'text-green-700' : 'text-gray-600'}>
                  {pair.dutch}
                </span>
                {answer === true && <span className="ml-auto text-green-600 shrink-0">✓</span>}
                {answer === false && <span className="ml-auto text-red-600 shrink-0">✗</span>}
              </li>
            )
          })}
        </ul>
      </div>

      {chatGptLink && (
        <button
          type="button"
          data-chatgpt-link
          onClick={() => { openChatGptInBackground(chatGptLink.url); setChatGptLink(null) }}
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50"
          style={{ left: Math.min(chatGptLink.x, window.innerWidth - 180), top: chatGptLink.y }}
        >
          Open in ChatGPT
        </button>
      )}
    </div>
  )
}
