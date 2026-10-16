import { useEffect, useRef } from 'react'
import type { useMistakes } from '../hooks/useMistakes'
import { PracticeCounter } from './PracticeCounter'

type Props = ReturnType<typeof useMistakes> & {
  isLoggedIn: boolean
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
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
    <PracticeCounter practicedDates={fouten.practicedDates} onCheckIn={fouten.onCheckIn} onCancelCheckIn={fouten.onCancelCheckIn} />
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
    return <div>{counter}<p className="text-sm text-gray-500">Er staan nog geen fouten in het bestand.</p></div>
  }

  if (fouten.done || !fouten.current) {
    return (
      <div>
        {counter}
        <div className="border rounded p-4 bg-white text-center space-y-3">
          <p className="font-semibold">Klaar! Je hebt alle {mistakes.length} fouten geoefend.</p>
          <div className="flex justify-center gap-2">
            <button onClick={fouten.restart} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
              Opnieuw
            </button>
            <button onClick={loadMistakesAsync} className="px-3 py-1 text-sm border rounded hover:bg-gray-100">
              Bestand opnieuw laden
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { current, revealed } = fouten
  const hasAttempt = fouten.userInput.trim().length > 0

  return (
    <div>
      {counter}
      <div className="border rounded p-4 bg-white space-y-4">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Fout {fouten.currentIndex + 1} van {fouten.queue.length}{current.type && ` · ${current.type}`}</span>
          <span title="Aantal keer goed (noOfTimesPracticed)">✓ {current.timesPracticed}× goed</span>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Verbeter deze zin:</p>
          <p className="text-lg text-red-700">{current.mistake}</p>
        </div>

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
          placeholder="Jouw verbetering..."
          className="w-full border rounded p-2 text-sm"
        />

        {!revealed ? (
          <button onClick={fouten.reveal} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
            Toon antwoord
          </button>
        ) : (
          <>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-1">Mogelijke verbetering:</p>
              <p className="text-lg text-green-700">{current.correction}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fouten.askChatGpt}
                disabled={!hasAttempt}
                title={hasAttempt ? undefined : 'Typ eerst je verbetering'}
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
            </div>
            {!fouten.markedCorrect && (
              <p className="text-xs text-gray-400">Niet op &quot;Goed&quot; geklikt? Dan komt deze fout over een paar zinnen terug.</p>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
