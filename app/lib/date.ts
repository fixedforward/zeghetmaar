export function todayLocalIso(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function formatDutchDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} ${DUTCH_MONTHS[month - 1]} ${year}`
}
