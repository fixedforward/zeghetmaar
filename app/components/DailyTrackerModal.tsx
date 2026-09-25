import { todayLocalIso } from '../lib/date'
import { computeFullStreak, type PracticeLogType } from '../lib/practiceLog'
import type { usePracticeTracker } from '../hooks/usePracticeTracker'

export interface DailyTrackerItem {
  type: PracticeLogType
  label: string
  tracker: ReturnType<typeof usePracticeTracker>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  isLoggedIn: boolean
  items: DailyTrackerItem[]
}

export function DailyTrackerModal({ isOpen, onClose, isLoggedIn, items }: Props) {
  if (!isOpen) return null

  const today = todayLocalIso()
  const streak = computeFullStreak(items.map(({ tracker }) => tracker.practicedDates), today)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-gray-900">Dagelijkse tracker</h2>
          <button onClick={onClose} title="Sluiten" className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>

        {!isLoggedIn ? (
          <p className="text-sm text-gray-500">Log in (via ⚙ Instellingen) om je dagelijkse tracker te gebruiken.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {items.map(({ type, label, tracker }) => {
                const checked = tracker.practicedDates.has(today)
                return (
                  <li key={type} className="flex items-center gap-2 border rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => (checked ? tracker.cancelPracticedToday() : tracker.markPracticedToday())}
                      className="shrink-0"
                    />
                    <span className="flex-1 text-sm text-gray-800">{label}</span>
                  </li>
                )
              })}
            </ul>
            {streak > 0 && (
              <p className="text-xs text-gray-500">🔥 {streak} dag{streak === 1 ? '' : 'en'} op rij volledig afgevinkt.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
