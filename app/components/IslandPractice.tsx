import { useEffect } from 'react'
import type { useIslandPractice } from '../hooks/useIslandPractice'
import { SECONDS_PER_CARD } from '../hooks/useIslandPractice'
import { isTypingTarget } from '../lib/keyboard'
import { CardScratchField } from './CardScratchField'

type Props = {
  practice: ReturnType<typeof useIslandPractice>
  onRestart: () => void
}

export function IslandPractice({ practice, onRestart }: Props) {
  const { current, revealed, reveal, markAndNext } = practice

  useEffect(() => {
    if (!current) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        reveal()
      } else if (revealed && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        markAndNext(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [current, revealed, reveal, markAndNext])

  if (practice.finished) {
    return (
      <div className="border rounded p-4 bg-white space-y-3 text-center">
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

  return (
    <div className="border rounded p-4 bg-white space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className={revealed ? 'text-gray-400' : practice.secondsLeft <= 3 ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {revealed ? 'Antwoord' : `${practice.secondsLeft} s`}
        </span>
        <button onClick={practice.stop} className="text-xs text-gray-500 hover:underline">✕ Stoppen</button>
      </div>
      {!revealed && (
        <div className="h-1 bg-gray-100 rounded overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(practice.secondsLeft / SECONDS_PER_CARD) * 100}%` }} />
        </div>
      )}
      <p className="text-xl font-medium text-gray-800 text-center">{current.english}</p>
      <CardScratchField key={`scratch-${practice.cardIndex}`} revealed={revealed} onReveal={reveal} />
      {revealed
        ? (
          <>
            <ul className="space-y-1 text-green-700 text-center">
              {current.options.map(option => <li key={option}>{option}</li>)}
            </ul>
            <div className="flex justify-center gap-2">
              <button onClick={() => markAndNext(false)} className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600">Fout (1)</button>
              <button onClick={() => markAndNext(true)} className="px-4 py-2 text-sm rounded bg-green-500 text-white hover:bg-green-600">Goed (2)</button>
            </div>
          </>
        )
        : (
          <div className="flex justify-center">
            <button onClick={reveal} className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600">Toon antwoord (Spatie)</button>
          </div>
        )}
    </div>
  )
}
