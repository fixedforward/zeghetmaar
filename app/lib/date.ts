// The date as `YYYY-MM-DD` in the browser's local timezone.
export function localIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function todayLocalIso(): string {
  return localIsoDate(new Date())
}

const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function formatDutchDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} ${DUTCH_MONTHS[month - 1]} ${year}`
}

const DUTCH_WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

// Counted in UTC so a daylight saving change can't skip or repeat a day.
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function dutchWeekday(iso: string): string {
  return DUTCH_WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]
}

export function formatDutchWeekdayDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number)
  return `${dutchWeekday(iso)} ${day} ${DUTCH_MONTHS[month - 1]}`
}
