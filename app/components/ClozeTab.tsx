import { useEffect, useRef, useState, type ComponentProps } from 'react'
import type { ClozeMode, useCloze } from '../hooks/useCloze'
import type { useWords } from '../hooks/useWords'
import { buildClozeQuestions, buildFlashcards, maskWord } from '../lib/cloze'
import { DEFAULT_DAY_RANGE, filterWordsByDaysSinceAdded, type DayRange } from '../lib/wordFilters'
import { DayRangeSelect } from './DayRangeSelect'
import { PracticeCounter } from './PracticeCounter'
import { PhraseDetailModal } from './PhraseDetailModal'

type Props = ReturnType<typeof useCloze> & ReturnType<typeof useWords> & {
  isLoggedIn: boolean
  trackers: Record<ClozeMode, ComponentProps<typeof PracticeCounter>>
}

export function ClozeTab(props: Props) {
  const {
    words, wordsLoading, wordsError, isLoggedIn, trackers,
    startEdit, setBeheersing, beheersingLoadingId,
    mode, reversed, questions, currentIndex, userInput, setUserInput, checked, answers, score,
    start, stop, checkAnswer, nextQuestion, reveal, markAndNext, jumpTo, restart,
  } = props

  const isActive = questions.length > 0
  const total = questions.length
  const done = isActive && currentIndex >= total

  const [daysFilter, setDaysFilter] = useState<DayRange | null>(DEFAULT_DAY_RANGE)

  // Keeps typing uninterrupted across questions — refocuses whenever a new
  // question loads, whether that's via Enter, the "Volgende" button, or a
  // click in Overzicht, since none of those otherwise return focus here.
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [currentIndex])

  // Anki-style shortcuts: Space/Enter reveals, then 1 = Fout and 2 = Goed.
  const kaartenActive = mode === 'kaarten' && isActive && !done
  useEffect(() => {
    if (!kaartenActive) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (!checked && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        reveal()
      } else if (checked && (e.key === '1' || e.key === '2')) {
        markAndNext(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [kaartenActive, checked, reveal, markAndNext])

  if (!isActive) {
    const filteredWords = filterWordsByDaysSinceAdded(words, daysFilter)
    const typenCount = buildClozeQuestions(filteredWords).length
    const kaartenCount = buildFlashcards(filteredWords).length
    return (
      <div className="space-y-4">
        {isLoggedIn && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Typen</p>
            <PracticeCounter {...trackers.typen} />
            <p className="text-xs font-medium text-gray-600 mb-1">Kaarten</p>
            <PracticeCounter {...trackers.kaarten} />
          </div>
        )}
        <p className="text-sm text-gray-500">
          Typen: vul het ontbrekende woord in een voorbeeldzin uit je fraselijst in — Clozemaster-stijl.
          Kaarten: zie de frase, draai de kaart om naar de betekenis en kies zelf Goed/Fout — Anki-stijl.
          Kaarten omgekeerd: zie de vertaling en bedenk de frase.
        </p>
        {wordsLoading && <p className="text-sm text-gray-400 italic">Fraselijst laden...</p>}
        {wordsError && <p className="text-sm text-red-600">{wordsError}</p>}
        {!wordsLoading && !wordsError && words.length === 0 && (
          <p className="text-sm text-gray-400">Geen frasen gevonden. Voeg eerst frases toe in de Fraselijst.</p>
        )}
        {!wordsLoading && !wordsError && words.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <DayRangeSelect value={daysFilter} onChange={setDaysFilter} />
          </div>
        )}
        {!wordsLoading && !wordsError && words.length > 0 && kaartenCount === 0 && (
          <p className="text-sm text-gray-400">Geen frasen gevonden voor deze filters.</p>
        )}
        {!wordsLoading && !wordsError && kaartenCount > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => start(filteredWords, 'typen')}
              disabled={typenCount === 0}
              title={typenCount === 0 ? 'Geen frasen met een bruikbare voorbeeldzin voor deze filters.' : undefined}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              Start typen ({typenCount} frases)
            </button>
            <button
              onClick={() => start(filteredWords, 'kaarten')}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
            >
              Start kaarten ({kaartenCount} frases)
            </button>
            <button
              onClick={() => start(filteredWords, 'kaarten', true)}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
            >
              Start kaarten: vertaling → frase ({kaartenCount} frases)
            </button>
          </div>
        )}
      </div>
    )
  }

  if (done) {
    return (
      <div className="space-y-4 text-center py-8">
        {isLoggedIn && <div className="flex justify-center"><PracticeCounter {...trackers[mode]} /></div>}
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
  const meanings = currentEntry?.meanings ?? [{ translation: question.translation, examples: [] }]

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

  const beheersingButtons = currentEntry && (
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
  )

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">
          {mode === 'kaarten' ? 'Kaart' : 'Zin'} {currentIndex + 1} van {total} · {score.correct} goed, {score.incorrect} fout
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

      {mode === 'kaarten' ? (
        <div className="space-y-3">
          {/* Keyed by index so the next card mounts face-up instead of animating
              back and briefly showing its meaning. */}
          <button
            key={currentIndex}
            type="button"
            onClick={reveal}
            disabled={checked}
            title="Klik of druk op Spatie om om te draaien"
            className="block w-full [perspective:1000px] disabled:cursor-default"
          >
            <div
              className={`grid transition-transform duration-500 [transform-style:preserve-3d] ${checked ? '[transform:rotateY(180deg)]' : ''}`}
            >
              <div className="[grid-area:1/1] [backface-visibility:hidden] border rounded bg-white p-8 min-h-40 flex flex-col items-center justify-center gap-2">
                {reversed
                  ? meanings.map((m, i) => <p key={i} className="text-2xl font-semibold text-gray-900">{m.translation}</p>)
                  : (
                    <>
                      <p className="text-2xl font-semibold text-gray-900">{question.word}</p>
                      <p className="text-sm text-gray-500">
                        {meanings.length} {meanings.length === 1 ? 'betekenis' : 'betekenissen'}
                      </p>
                    </>
                  )}
                <p className="text-xs text-gray-400">Klik om om te draaien (Spatie)</p>
              </div>
              <div className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)] border rounded bg-blue-50 p-8 min-h-40 flex flex-col items-center justify-center gap-2 text-center">
                {reversed ? (
                  <>
                    <p className="text-sm text-gray-500">{meanings.map(m => m.translation).join(' · ')}</p>
                    <p className="text-2xl font-semibold text-gray-900">{question.word}</p>
                    {meanings.map((m, i) => m.examples[0] && (
                      <p key={i} className="text-xs text-gray-500 italic">{m.examples[0]}</p>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">{question.word}</p>
                    {meanings.map((m, i) => (
                      <div key={i}>
                        <p className="text-xl font-semibold text-gray-900">{m.translation}</p>
                        {m.examples[0] && <p className="text-xs text-gray-500 italic">{m.examples[0]}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </button>
          {checked && (
            <div className="space-y-2">
              {beheersingButtons}
              <div className="flex gap-2">
                <button
                  onClick={() => markAndNext(false)}
                  title="Sneltoets: 1"
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  ✗ Fout (1)
                </button>
                <button
                  onClick={() => markAndNext(true)}
                  title="Sneltoets: 2"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  ✓ Goed (2)
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
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
              {beheersingButtons}
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
      )}

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
                  {reversed ? q.translation : q.word}
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
