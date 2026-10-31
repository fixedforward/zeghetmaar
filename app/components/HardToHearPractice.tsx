import { useEffect, useRef } from 'react'
import type { useHardToHearPractice } from '../hooks/useHardToHearPractice'
import type { HardToHearPhrase } from '../types'
import { isModalOpen, isTypingTarget } from '../lib/keyboard'

type Props = {
  practice: ReturnType<typeof useHardToHearPractice>
  onPlay: (phrase: HardToHearPhrase) => void
  linesAround?: (phrase: HardToHearPhrase) => { before?: string; after?: string }
}

export function HardToHearPractice({ practice, onPlay, linesAround }: Props) {
  const { current, index, total, hasPrevious, hasNext, stop, previous, next } = practice
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay

  // Every line plays right away when you get to it, also when you go back to one.
  useEffect(() => {
    if (current) onPlayRef.current(current)
  }, [index, current])

  // 1 = Vorige, 2 = Volgende.
  const hasLine = !!current
  useEffect(() => {
    if (!hasLine) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target) || isModalOpen()) return
      if (e.key === '1') previous()
      else if (e.key === '2') next()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasLine, previous, next])

  if (!current) return null
  const { before, after } = linesAround?.(current) ?? {}

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Fragment {index + 1} van {total}</span>
        <button type="button" onClick={stop} className="text-xs text-gray-400 hover:text-gray-600">✕ Stoppen</button>
      </div>
      <button type="button" onClick={() => onPlay(current)} className="px-3 py-1 text-sm border rounded text-blue-600">
        Opnieuw afspelen
      </button>
      {/* Keyed by index so the next line starts folded again. */}
      <details key={index} className="rounded border border-gray-200 bg-gray-50 p-2">
        <summary className="text-sm text-gray-600 cursor-pointer select-none">Ondertitel tonen</summary>
        <div className="mt-1 space-y-0.5">
          {before && <p className="text-sm text-gray-500">{before}</p>}
          <p className="font-medium text-gray-900">{current.text}</p>
          {after && <p className="text-sm text-gray-500">{after}</p>}
        </div>
      </details>
      <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
        🗣️ Herhaal de uitdrukking hardop voordat je naar de volgende gaat.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={previous} disabled={!hasPrevious} title="Sneltoets: 1" className="px-3 py-1 text-sm border rounded disabled:opacity-50">
          Vorige (1)
        </button>
        <button type="button" onClick={next} disabled={!hasNext} title="Sneltoets: 2" className="px-3 py-1 text-sm border rounded disabled:opacity-50">
          Volgende (2)
        </button>
      </div>
    </div>
  )
}
