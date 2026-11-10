import type { Tab, WordEntry } from '../types'
import { TAB_LABELS } from '../config/tabs'
import { weekDates, type DailyGoal } from '../lib/dailyGoals'
import { dutchWeekday, formatDutchWeekdayDate } from '../lib/date'
import { TabIcon } from './TabIcon'

type Props = {
  isLoggedIn: boolean
  today: string
  goals: DailyGoal[]
  streak: number
  practicedDays: Set<string>
  recentWords: WordEntry[]
  onSelect: (tab: Tab) => void
  onCheckInListening: () => void
  onSignIn: () => void
}

function goalDetail(goal: DailyGoal): string | null {
  if (goal.tab === 'luisteren') return '10 minuten actief luisteren'
  return null
}

export function VandaagTab({ isLoggedIn, today, goals, streak, practicedDays, recentWords, onSelect, onCheckInListening, onSignIn }: Props) {
  const doneCount = goals.filter(g => g.done).length
  const next = goals.find(g => !g.done)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 first-letter:uppercase">{formatDutchWeekdayDate(today)}</p>
          <h2 className="text-4xl font-bold tracking-tight">Vandaag</h2>
          {isLoggedIn && goals.length > 0 && (
            <p className="mt-1 text-gray-600">
              {next ? `Je hebt ${doneCount} van de ${goals.length} dagdoelen gehaald.` : 'Alle dagdoelen gehaald. Goed bezig!'}
            </p>
          )}
        </div>
        {isLoggedIn && next && (
          <button
            type="button"
            onClick={() => onSelect(next.tab)}
            className="min-h-12 px-5 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800"
          >
            ▶ Volgende: {TAB_LABELS[next.tab]}
          </button>
        )}
      </header>

      {!isLoggedIn ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-gray-700">Log in om je dagdoelen en je reeks te zien.</p>
          <button type="button" onClick={onSignIn} className="min-h-11 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">
            Inloggen met Google
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Reeks" className="flex flex-wrap items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5">
            <div>
              <p className="text-xl font-semibold">{streak} {streak === 1 ? 'dag' : 'dagen'} op rij</p>
              <p className="text-sm text-gray-500">Minstens één dagdoel per dag</p>
            </div>
            <ol aria-label="Deze week" className="flex gap-2 sm:ml-auto">
              {weekDates(today).map(date => {
                const practiced = practicedDays.has(date)
                const isToday = date === today
                return (
                  <li key={date} className={`flex flex-col items-center gap-1 text-xs ${isToday ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    <span
                      title={practiced ? 'Geoefend' : undefined}
                      className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                        practiced ? 'bg-blue-700 text-white' : isToday ? 'border-2 border-blue-700' : 'border-2 border-gray-200',
                      ].join(' ')}
                    >
                      {practiced && '✓'}
                    </span>
                    {dutchWeekday(date).slice(0, 2)}
                  </li>
                )
              })}
            </ol>
          </section>

          <section aria-labelledby="dagdoelen" className="space-y-3">
            <h3 id="dagdoelen" className="text-lg font-semibold">Dagdoelen</h3>
            {goals.length === 0 && <p className="text-sm text-gray-500">Alle tabs met een dagteller staan uit in Instellingen.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {goals.map(goal => {
                const detail = goalDetail(goal)
                return (
                  <article key={goal.tab} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${goal.done ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                        <TabIcon name={goal.tab} />
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${goal.done ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
                        {goal.done ? 'Gedaan' : 'Nog niet'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{TAB_LABELS[goal.tab]}</h4>
                      {detail && <p className="text-sm text-gray-500">{detail}</p>}
                    </div>
                    <div className="mt-auto space-y-1">
                      <button
                        type="button"
                        onClick={() => onSelect(goal.tab)}
                        className={[
                          'w-full min-h-11 rounded-lg text-sm font-semibold',
                          goal.done ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-blue-700 text-white hover:bg-blue-800',
                        ].join(' ')}
                      >
                        {goal.done ? 'Nog een ronde' : 'Start'}
                      </button>
                      {goal.tab === 'luisteren' && !goal.done && (
                        <button type="button" onClick={onCheckInListening} className="w-full min-h-10 text-sm text-blue-700 hover:underline">
                          Ik heb vandaag geluisterd
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}

      {recentWords.length > 0 && (
        <section aria-labelledby="net-toegevoegd" className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 id="net-toegevoegd" className="font-semibold">Net toegevoegd</h3>
            <button type="button" onClick={() => onSelect('fraselijst')} className="text-sm font-medium text-blue-700 hover:underline">
              Hele fraselijst
            </button>
          </div>
          <ul>
            {recentWords.map(word => (
              <li key={word.id} className="flex items-center gap-3 py-2.5 border-t border-gray-100 first:border-t-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{word.word}</p>
                  {word.meanings[0] && <p className="text-sm text-gray-500">{word.meanings[0].translation}</p>}
                </div>
                {word.tags?.[0] && (
                  <span className="text-xs text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{word.tags[0]}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
