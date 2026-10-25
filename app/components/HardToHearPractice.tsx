import { useEffect, useRef } from 'react'
import type { useHardToHearPractice } from '../hooks/useHardToHearPractice'
import type { HardToHearPhrase } from '../types'
import { isModalOpen, isTypingTarget } from '../lib/keyboard'

type Props = {
  practice: ReturnType<typeof useHardToHearPractice>
  onPlay: (phrase: HardToHearPhrase) => void
}

export function HardToHearPractice({ practice, onPlay }: Props) {
  const { done, current, index, total, score, stop, next } = practice
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay

  // Every new line plays right away; keyed on the index so a line that comes back plays again.
  useEffect(() => {
    if (current) onPlayRef.current(current)
  }, [index, current])

  // 1 = Niet verstaan, 2 = Verstaan, like the Cloze cards.
  const hasLine = !!current
  useEffect(() => {
    if (!hasLine) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target) || isModalOpen()) return
      if (e.key === '1' || e.key === '2') next(e.key === '2')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasLine, next])

  if (done) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-700">Klaar! {score.correct} verstaan, {score.incorrect} niet verstaan.</p>
        <button type="button" onClick={stop} className="px-3 py-1 text-sm border rounded">Terug</button>
      </div>
    )
  }
  if (!current) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Fragment {index + 1} van {total} · {score.correct} verstaan, {score.incorrect} niet verstaan</span>
        <button type="button" onClick={stop} className="text-xs text-gray-400 hover:text-gray-600">✕ Stoppen</button>
      </div>
      <button type="button" onClick={() => onPlay(current)} className="px-3 py-1 text-sm border rounded text-blue-600">
        Opnieuw afspelen
      </button>
      {/* Keyed by index so the next line starts folded again. */}
      <details key={index} className="rounded border border-gray-200 bg-gray-50 p-2">
        <summary className="text-sm text-gray-600 cursor-pointer select-none">Ondertitel tonen</summary>
        <p className="mt-1 text-gray-800">{current.text}</p>
      </details>
      <div className="flex gap-2">
        <button type="button" onClick={() => next(false)} title="Sneltoets: 1" className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600">
          ✗ Niet verstaan (1)
        </button>
        <button type="button" onClick={() => next(true)} title="Sneltoets: 2" className="px-3 py-1 text-sm rounded bg-green-500 text-white hover:bg-green-600">
          ✓ Verstaan (2)
        </button>
      </div>
    </div>
  )
}
