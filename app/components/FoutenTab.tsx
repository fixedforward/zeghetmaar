import { useEffect, useRef, useState } from 'react'
import type { useMistakes } from '../hooks/useMistakes'
import { PracticeCounter } from './PracticeCounter'
import { matchesPracticedFilter, PRACTICED_FILTER_OPTIONS } from '../lib/mistakes'

type Props = ReturnType<typeof useMistakes> & {
  isLoggedIn: boolean
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
}

function DeleteMistakeButton({ onDelete, deleting }: { onDelete: () => void; deleting: boolean }) {
  const [confirming, setConfirming] = useState(false)

  if (deleting) return <span className="text-xs text-gray-400 shrink-0">Verwijderen...</span>
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} title="Rij verwijderen" className="text-xs text-red-400 hover:text-red-600 shrink-0">
        ✕ Verwijderen
      </button>
    )
  }
  return (
    <span className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-gray-600">Verwijderen?</span>
      <button onClick={() => { setConfirming(false); onDelete() }} className="text-xs text-red-600 hover:underline font-medium">Ja</button>
      <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:underline">Nee</button>
    </span>
  )
}

function CorrectionEditor({ correction, saving, onSave }: { correction: string; saving: boolean; onSave: (text: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(correction)
  const changed = draft.trim() !== '' && draft.trim() !== correction

  return (
    <div className="space-y-1">
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={2}
        className="w-full border rounded p-2 text-lg text-green-700"
      />
      {changed && (
        <div className="flex gap-2">
          <button onClick={() => onSave(draft)} disabled={saving} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
            Opslaan
          </button>
          <button onClick={() => setDraft(correction)} disabled={saving} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">
            Annuleren
          </button>
        </div>
      )}
    </div>
  )
}

function MistakesOverview({ fouten }: { fouten: Props }) {
  const currentRow = fouten.done ? undefined : fouten.current?.row
  return (
    <details className="mt-4">
      <summary className="text-xs text-gray-400 mb-1 cursor-pointer select-none">Overzicht ({fouten.mistakes.length})</summary>
      <ul className="space-y-1 max-h-96 overflow-y-auto border rounded p-2 bg-white">
        {fouten.mistakes.map(m => (
          <li key={m.row} className={`text-sm px-2 py-1 rounded flex items-start gap-3 ${m.row === currentRow ? 'bg-blue-50 border border-blue-200' : ''}`}>
            <div className="flex-1 min-w-0">
              {m.translation && <p className="text-gray-700">{m.translation}</p>}
              <p className="text-red-700">{m.mistake}</p>
              <p className="text-green-700">{m.correction}</p>
              <p className="text-xs text-gray-400">{m.type && `${m.type} · `}✓ {m.timesPracticed}× goed</p>
            </div>
            <DeleteMistakeButton onDelete={() => fouten.deleteMistakeAsync(m.row)} deleting={fouten.deletingRow === m.row} />
          </li>
        ))}
      </ul>
    </details>
  )
}

export function FoutenTab(fouten: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { isLoggedIn, mistakes, loading, error, loadMistakesAsync } = fouten

  useEffect(() => {
    if (isLoggedIn && mistakes.length === 0 && !loading && !error) loadMistakesAsync()
  }, [isLoggedIn])

  useEffect(() => {
    inputRef.current?.focus()
  }, [fouten.currentIndex, fouten.queue])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je fouten te oefenen.</p>
  }

  const counter = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <PracticeCounter practicedDates={fouten.practicedDates} onCheckIn={fouten.onCheckIn} onCancelCheckIn={fouten.onCancelCheckIn} />
        <p className="text-xs text-gray-500 mb-3" title="Zinnen waarvan je vandaag het antwoord hebt bekeken">
          📝 Vandaag <span className="font-medium text-gray-700">{fouten.practicedTodayCount}</span> {fouten.practicedTodayCount === 1 ? 'zin' : 'zinnen'} geoefend
        </p>
      </div>
      {mistakes.length > 0 && (
        <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          Oefen zinnen
          <select
            value={fouten.practicedFilter}
            onChange={e => fouten.setPracticedFilter(e.target.value as typeof fouten.practicedFilter)}
            className="border rounded px-1.5 py-0.5 text-xs bg-white text-gray-700"
          >
            {PRACTICED_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label} ({mistakes.filter(m => matchesPracticedFilter(m, o.value)).length})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )

  if (loading) return <p className="text-sm text-gray-400">Fouten laden...</p>

  if (error && mistakes.length === 0) {
    return (
      <div>
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button onClick={loadMistakesAsync} className="text-sm text-blue-600 hover:underline">Opnieuw laden</button>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return <div>{counter}<p className="text-sm text-gray-500">Er staan nog geen zinnen in het bestand.</p></div>
  }

  if (fouten.queue.length === 0) {
    return (
      <div>
        {counter}
        <p className="text-sm text-gray-500">Geen zinnen met dit aantal keer goed. Kies een andere filter.</p>
        <MistakesOverview fouten={fouten} />
      </div>
    )
  }

  if (fouten.done || !fouten.current) {
    return (
      <div>
        {counter}
        <div className="border rounded p-4 bg-white text-center space-y-3">
          <p className="font-semibold">Klaar! Je hebt alle {new Set(fouten.queue).size} zinnen geoefend.</p>
          <div className="flex justify-center gap-2">
            <button onClick={fouten.restart} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
              Opnieuw
            </button>
            <button onClick={loadMistakesAsync} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">
              Bestand opnieuw laden
            </button>
          </div>
        </div>
        <MistakesOverview fouten={fouten} />
      </div>
    )
  }

  const { current, revealed } = fouten
  const hasAttempt = fouten.userInput.trim().length > 0
  const skipButton = (
    <button onClick={fouten.skip} title="Deze zin komt deze sessie niet meer terug" className="px-3 py-1 text-sm border rounded text-gray-600 hover:bg-gray-100">
      Overslaan ⏭
    </button>
  )

  return (
    <div>
      {counter}
      <div className="border rounded p-4 bg-white space-y-4">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Fout {fouten.currentIndex + 1} van {fouten.queue.length}{current.type && ` · ${current.type}`}</span>
          <span className="flex items-center gap-3">
            <span title="Aantal keer goed (noOfTimesPracticed)">✓ {current.timesPracticed}× goed</span>
            <DeleteMistakeButton key={current.row} onDelete={() => fouten.deleteMistakeAsync(current.row)} deleting={fouten.deletingRow === current.row} />
          </span>
        </div>

        {current.translation ? (
          <div>
            <p className="text-xs text-gray-500 mb-1">Vertaal naar het Nederlands:</p>
            <p className="text-lg">{current.translation}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-1">Verbeter deze zin:</p>
            <p className="text-lg text-red-700">{current.mistake}</p>
          </div>
        )}

        <input
          ref={inputRef}
          value={fouten.userInput}
          onChange={e => fouten.setUserInput(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (revealed) fouten.next()
            else fouten.reveal()
          }}
          placeholder={current.translation ? 'Jouw vertaling...' : 'Jouw verbetering...'}
          className="w-full border rounded p-2 text-sm"
        />

        {!revealed ? (
          <div className="flex gap-2">
            <button onClick={fouten.reveal} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
              Toon antwoord
            </button>
            {skipButton}
          </div>
        ) : (
          <>
            <div className="border-t pt-3 space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">{current.translation ? 'Mogelijke vertaling:' : 'Mogelijke verbetering:'}</p>
                <CorrectionEditor
                  key={`${current.row}:${current.correction}`}
                  correction={current.correction}
                  saving={fouten.saving}
                  onSave={fouten.saveCorrectionAsync}
                />
              </div>
              {current.translation && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Je eerdere fout:</p>
                  <p className="text-sm text-red-700">{current.mistake}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fouten.askChatGpt}
                disabled={!hasAttempt}
                title={hasAttempt ? undefined : 'Typ eerst je antwoord'}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Vraag ChatGPT
              </button>
              <button
                onClick={fouten.toggleCorrectAsync}
                disabled={fouten.saving}
                title={fouten.markedCorrect ? 'Klik om te annuleren' : 'Telt 1 op bij noOfTimesPracticed'}
                className={[
                  'px-3 py-1 text-sm rounded border transition-colors disabled:opacity-50',
                  fouten.markedCorrect
                    ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
                ].join(' ')}
              >
                {fouten.markedCorrect ? '✓ Goed (annuleren)' : 'Goed (+1)'}
              </button>
              <button onClick={fouten.next} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                Volgende →
              </button>
              {skipButton}
            </div>
            {!fouten.markedCorrect && (
              <p className="text-xs text-gray-400">Niet op &quot;Goed&quot; geklikt? Dan komt deze fout over een paar zinnen terug.</p>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <MistakesOverview fouten={fouten} />
    </div>
  )
}
