import { DAY_RANGE_OPTIONS, type DayRange } from '../lib/wordFilters'

type Props = {
  value: DayRange | null
  onChange: (range: DayRange | null) => void
}

const toKey = (range: DayRange) => `${range.from}-${range.to}`

export function DayRangeSelect({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-gray-500">
      Toegevoegd
      <select
        value={value ? toKey(value) : 'all'}
        onChange={(e) => onChange(DAY_RANGE_OPTIONS.find(o => toKey(o.range) === e.target.value)?.range ?? null)}
        className="border rounded px-1.5 py-0.5 text-xs bg-white text-gray-700"
      >
        {DAY_RANGE_OPTIONS.map(o => (
          <option key={toKey(o.range)} value={toKey(o.range)}>{o.label}</option>
        ))}
        <option value="all">alle</option>
      </select>
    </label>
  )
}
