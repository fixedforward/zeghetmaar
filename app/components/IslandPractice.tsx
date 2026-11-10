import type { ReactNode } from 'react'
import type { useIslandPractice } from '../hooks/useIslandPractice'
import { SECONDS_PER_CARD } from '../hooks/useIslandPractice'
import { useRevealMarkShortcuts } from '../hooks/useRevealMarkShortcuts'
import { CardScratchField } from './CardScratchField'
import { FocusScreen } from './FocusScreen'
import { MarkButtons } from './MarkButtons'

type Props = {
  practice: ReturnType<typeof useIslandPractice>
  onRestart: () => void
}

export function IslandPractice({ practice, onRestart }: Props) {
  const { current, revealed, reveal, markAndNext } = practice

  useRevealMarkShortcuts(!!current, revealed, reveal, markAndNext)

  const focusScreen = (children: ReactNode) => (
    <FocusScreen
      title="Taaleilanden"
      progress={{ current: practice.finished ? practice.queueLength : practice.cardIndex + 1, total: practice.queueLength }}
      status={`${practice.score} meteen goed`}
      shortcuts={[{ keys: 'Spatie', label: 'toon antwoord' }, { keys: '1', label: 'fout' }, { keys: '2', label: 'goed' }]}
      onStop={practice.stop}
    >
      {children}
    </FocusScreen>
  )

  if (practice.finished) {
    return focusScreen(
      <div className="border rounded-3xl p-6 bg-white space-y-3 text-center">
        <p className="text-lg font-medium">{practice.score} van {practice.total} meteen goed</p>
        <p className="text-sm text-gray-500">Totale tijd: {practice.totalSeconds} s</p>
        <div className="flex justify-center gap-2">
          <button onClick={onRestart} className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600">Nog een ronde</button>
          <button onClick={practice.stop} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Terug naar de lijst</button>
        </div>
      </div>
    )
  }

  if (!current) return null

  return focusScreen(
    <div className="border rounded-3xl p-6 sm:p-8 bg-white space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className={revealed ? 'text-gray-400' : practice.secondsLeft <= 3 ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {revealed ? 'Antwoord' : `${practice.secondsLeft} s`}
        </span>
      </div>
      {!revealed && (
        <div className="h-1 bg-gray-100 rounded overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(practice.secondsLeft / SECONDS_PER_CARD) * 100}%` }} />
        </div>
      )}
      <p className="text-3xl font-bold tracking-tight text-gray-900 text-center">{current.english}</p>
      <CardScratchField key={`scratch-${practice.cardIndex}`} revealed={revealed} onReveal={reveal} />
      {revealed
        ? (
          <>
            <ul className="space-y-1 text-xl text-green-700 text-center">
              {current.options.map(option => <li key={option}>{option}</li>)}
            </ul>
            <MarkButtons onMark={markAndNext} />
          </>
        )
        : (
          <div className="flex justify-center">
            <button onClick={reveal} className="min-h-11 px-5 text-sm font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600">Toon antwoord (Spatie)</button>
          </div>
        )}
    </div>
  )
}
