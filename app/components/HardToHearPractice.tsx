import { useEffect, useRef } from 'react'
import type { useHardToHearPractice } from '../hooks/useHardToHearPractice'
import type { HardToHearPhrase } from '../types'

type Props = {
  practice: ReturnType<typeof useHardToHearPractice>
  onPlay: (phrase: HardToHearPhrase) => void
}

export function HardToHearPractice({ practice, onPlay }: Props) {
  const { done, current, index, total, input, setInput, result, score, stop, check, next } = practice
  const inputRef = useRef<HTMLInputElement>(null)
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay

  // Every new line plays right away; keyed on the index so a line that comes back plays again.
  useEffect(() => {
    if (!current) return
    onPlayRef.current(current)
    inputRef.current?.focus()
  }, [index, current])

  if (done) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-700">Klaar! {score.correct} goed, {score.incorrect} fout.</p>
        <button type="button" onClick={stop} className="px-3 py-1 text-sm border rounded">Terug naar de lijst</button>
      </div>
    )
  }
  if (!current) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Zin {index + 1} van {total} · {score.correct} goed, {score.incorrect} fout</span>
        <button type="button" onClick={stop} className="text-xs text-gray-400 hover:text-gray-600">✕ Stoppen</button>
      </div>
      <button type="button" onClick={() => onPlay(current)} className="px-3 py-1 text-sm border rounded text-blue-600">
        ▶ Opnieuw afspelen
      </button>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (!result) check()
          else next(result.correct)
        }}
        readOnly={!!result}
        placeholder="Typ wat je hoort — Enter controleert"
        className={`w-full p-2 border rounded text-sm ${result ? 'bg-gray-50' : ''}`}
      />
      {!result ? (
        <button type="button" onClick={check} disabled={!input.trim()} className="px-3 py-1 text-sm rounded bg-blue-500 text-white disabled:opacity-50">
          Controleren
        </button>
      ) : (
        <div className="space-y-2">
          <p className={`text-sm ${result.correct ? 'text-green-700' : 'text-red-600'}`}>{result.correct ? '✓ Goed!' : '✗ Niet helemaal:'}</p>
          <p className="text-gray-800">
            {result.words.map((word, i) => (
              <span key={i} className={word.heard ? '' : 'text-red-600 underline decoration-red-400'}>{i > 0 && ' '}{word.text}</span>
            ))}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => next(result.correct)} className="px-3 py-1 text-sm rounded bg-blue-500 text-white">
              Volgende →
            </button>
            {!result.correct && (
              <button type="button" onClick={() => next(true)} title="Bijvoorbeeld bij een tikfout" className="px-3 py-1 text-sm border rounded">
                Toch goed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
