import { useEffect, useRef, useState } from 'react'
import type { useCloze } from '../hooks/useCloze'
import type { useWords } from '../hooks/useWords'
import { buildClozeQuestions, maskWord } from '../lib/cloze'
import { filterWordsByDaysSinceAdded } from '../lib/wordFilters'
import { PracticeCounter } from './PracticeCounter'
import { PhraseDetailModal } from './PhraseDetailModal'

type Props = ReturnType<typeof useCloze> & ReturnType<typeof useWords> & {
  isLoggedIn: boolean
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
}

export function ClozeTab(props: Props) {
  const {
    words, wordsLoading, wordsError, isLoggedIn, practicedDates, onCheckIn, onCancelCheckIn,
    startEdit, setBeheersing, beheersingLoadingId,
    questions, currentIndex, userInput, setUserInput, checked, answers, score,
    start, stop, checkAnswer, nextQuestion, jumpTo, restart,
  } = props

  const isActive = questions.length > 0
  const total = questions.length
  const done = isActive && currentIndex >= total

  const [daysFilter, setDaysFilter] = useState<number | null>(3)

  // Keeps typing uninterrupted across questions — refocuses whenever a new
  // question loads, whether that's via Enter, the "Volgende" button, or a
  // click in Overzicht, since none of those otherwise return focus here.
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [currentIndex])

  if (!isActive) {
    const filteredWords = filterWordsByDaysSinceAdded(words, daysFilter)
    const eligibleCount = buildClozeQuestions(filteredWords).length
    return (
      <div className="space-y-4">
        {isLoggedIn && <PracticeCounter practicedDates={practicedDates} onCheckIn={onCheckIn} onCancelCheckIn={onCancelCheckIn} />}
        <p className="text-sm text-gray-500">
          Vul het ontbrekende woord in een voorbeeldzin uit je fraselijst in — Clozemaster-stijl.
        </p>
        {wordsLoading && <p className="text-sm text-gray-400 italic">Fraselijst laden...</p>}
        {wordsError && <p className="text-sm text-red-600">{wordsError}</p>}
        {!wordsLoading && !wordsError && words.length === 0 && (
          <p className="text-sm text-gray-400">Geen frasen gevonden. Voeg eerst frases toe in de Fraselijst.</p>
        )}
        {!wordsLoading && !wordsError && words.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              Toegevoegd binnen laatste
              <select
                value={daysFilter ?? 'all'}
                onChange={(e) => setDaysFilter(e.target.value === 'all' ? null : Number(e.target.value))}
                className="border rounded px-1.5 py-0.5 text-xs bg-white text-gray-700"
              >
                <option value="1">1 dag</option>
                <option value="3">3 dagen</option>
                <option value="7">7 dagen</option>
                <option value="14">14 dagen</option>
                <option value="30">30 dagen</option>
                <option value="all">alle</option>
              </select>
            </label>
          </div>
        )}
        {!wordsLoading && !wordsError && words.length > 0 && eligibleCount === 0 && (
          <p className="text-sm text-gray-400">Geen frasen met een bruikbare voorbeeldzin gevonden voor deze filters.</p>
        )}
        {!wordsLoading && !wordsError && eligibleCount > 0 && (
          <button
            onClick={() => start(filteredWords)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Start Cloze-oefening ({eligibleCount} frases)
          </button>
        )}
      </div>
    )
  }

  if (done) {
    return (
      <div className="space-y-4 text-center py-8">
        {isLoggedIn && <div className="flex justify-center"><PracticeCounter practicedDates={practicedDates} onCheckIn={onCheckIn} onCancelCheckIn={onCancelCheckIn} /></div>}
        <p className="text-lg font-semibold text-gray-900">Klaar! 🎉</p>
        <p className="text-sm text-gray-600">{score.correct} goed, {score.incorrect} fout van {total}.</p>
        <div className="flex justify-center gap-2">
          <button onClick={restart} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
            Opnieuw
          </button>
          <button onClick={stop} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
            Terug
          </button>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  const isCorrect = answers[currentIndex]
  const currentEntry = words.find(w => w.id === question.phraseId)

  // How many letters the user already got right, starting from the front —
  // a wrong guess breaks the streak, same as the live red/green feedback above.
  let matchLen = 0
  while (
    matchLen < question.word.length &&
    userInput[matchLen]?.toLowerCase() === question.word[matchLen].toLowerCase()
  ) {
    matchLen++
  }
  const hintExhausted = matchLen >= question.word.length

  // Reveals one more correct letter on top of that prefix, discarding any
  // wrong letters typed after it instead of leaving them in the middle.
  const revealHint = () => {
    if (hintExhausted) return
    setUserInput(question.word.slice(0, matchLen + 1))
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">
          Zin {currentIndex + 1} van {total} · {score.correct} goed, {score.incorrect} fout
        </span>
        <div className="flex items-center gap-3">
          {currentEntry && (
            <button
              onClick={() => startEdit(currentEntry)}
              className="text-xs text-blue-600 hover:underline"
            >
              Beheren
            </button>
          )}
          <button onClick={stop} className="text-xs text-gray-400 hover:text-gray-600">✕ Stoppen</button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white space-y-3">
        <p className="text-lg">{maskWord(question.sentence, question.word)}</p>

        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 flex items-center px-2 py-2 border border-transparent text-sm font-mono whitespace-pre pointer-events-none"
          >
            {userInput.split('').map((ch, i) => {
              const target = question.word[i]
              const letterCorrect = !!target && ch.toLowerCase() === target.toLowerCase()
              return (
                <span key={i} className={letterCorrect ? 'text-green-600' : 'text-red-600'}>
                  {ch}
                </span>
              )
            })}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                checked ? nextQuestion() : checkAnswer()
              } else if (e.key === 'Tab' && !checked && !hintExhausted) {
                e.preventDefault()
                revealHint()
              }
            }}
            placeholder="Typ het ontbrekende woord..."
            readOnly={checked}
            className={`relative w-full p-2 border rounded text-sm font-mono bg-transparent text-transparent caret-gray-800 placeholder:text-gray-400 ${checked ? 'bg-gray-50' : ''}`}
          />
        </div>

        {checked && (
          <div className="space-y-2">
            <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
              {isCorrect ? '✓ Goed!' : `✗ Fout — het juiste woord was "${question.word}".`}
            </p>
            {question.translation && <p className="text-xs text-gray-500">{question.translation}</p>}
            {currentEntry && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Beheersing:</span>
                {([1, 2, 3] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setBeheersing(currentEntry.id, n)}
                    disabled={beheersingLoadingId === currentEntry.id}
                    title={`Beheersing ${n}`}
                    className={[
                      'w-6 h-6 rounded text-xs font-bold transition-colors disabled:opacity-50',
                      currentEntry.beheersing === n
                        ? n === 1 ? 'bg-red-400 text-white' : n === 2 ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!checked ? (
          <div className="flex gap-2">
            <button
              onClick={checkAnswer}
              disabled={!userInput.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              Controleer
            </button>
            <button
              onClick={revealHint}
              disabled={hintExhausted}
              title="Sneltoets: Tab"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              💡 Hint (Tab)
            </button>
          </div>
        ) : (
          <button
            onClick={nextQuestion}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            {currentIndex + 1 === total ? 'Afronden →' : 'Volgende →'}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-1">Overzicht</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto border rounded p-2 bg-white">
          {questions.map((q, i) => {
            const answer = answers[i]
            const isCurrent = i === currentIndex
            return (
              <li
                key={`${q.phraseId}-${i}`}
                onClick={() => jumpTo(i)}
                className={`text-sm px-2 py-1 rounded flex gap-2 cursor-pointer hover:bg-gray-50 ${isCurrent ? 'bg-blue-50 border border-blue-200' : ''}`}
              >
                <span className="text-gray-400 w-6 shrink-0">{i + 1}.</span>
                <span className={answer === false ? 'text-red-600' : answer === true ? 'text-green-700' : 'text-gray-600'}>
                  {q.word}
                </span>
                {answer === true && <span className="ml-auto text-green-600 shrink-0">✓</span>}
                {answer === false && <span className="ml-auto text-red-600 shrink-0">✗</span>}
              </li>
            )
          })}
        </ul>
      </div>

      <PhraseDetailModal {...props} />
    </div>
  )
}
