import { todayLocalIso } from '../lib/date'

type Props = {
  practicedDates: Set<string>
  onCheckIn: () => void
  onCancelCheckIn: () => void
}

export function PracticeCounter({ practicedDates, onCheckIn, onCancelCheckIn }: Props) {
  const count = practicedDates.size
  const checkedToday = practicedDates.has(todayLocalIso())

  return (
    <div className="flex items-center gap-3 mb-3">
      <p className="text-xs text-gray-500">
        📅 <span className="font-medium text-gray-700">{count}</span> dag{count === 1 ? '' : 'en'} geoefend
      </p>
      <button
        type="button"
        onClick={checkedToday ? onCancelCheckIn : onCheckIn}
        title={checkedToday ? 'Klik om te annuleren' : undefined}
        className={[
          'text-xs px-2 py-1 rounded border transition-colors',
          checkedToday
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
        ].join(' ')}
      >
        {checkedToday ? '✓ Vandaag ingecheckt (annuleren)' : 'Vandaag inchecken'}
      </button>
    </div>
  )
}
