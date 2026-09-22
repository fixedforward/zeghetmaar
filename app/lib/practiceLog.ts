// Encodes practiced days as one compact bitmap per year, so the whole log fits
// well within Drive's appProperties limits (124 bytes per property, 30 properties
// per file) instead of needing a growing list of date strings.
const YEAR_BITMAP_BYTES = 46 // ceil(366 / 8)

// Each practice type (Oefensessie, Quiz) tracks its own independent log, so they
// get their own appProperties namespace on the same phrase-list Drive file.
export const PRACTICE_LOG_TYPES = ['oefensessie', 'quiz', 'cloze'] as const
export type PracticeLogType = (typeof PRACTICE_LOG_TYPES)[number]

export function isPracticeLogType(value: string): value is PracticeLogType {
  return (PRACTICE_LOG_TYPES as readonly string[]).includes(value)
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidIsoDate(date: string): boolean {
  return ISO_DATE_RE.test(date)
}

export function isoDateToYearDay(date: string): { year: number; day: number } {
  const match = date.match(ISO_DATE_RE)
  if (!match) throw new Error('date must be in YYYY-MM-DD format.')
  const [, y, m, d] = match
  const year = Number(y)
  const startOfYear = Date.UTC(year, 0, 1)
  const target = Date.UTC(year, Number(m) - 1, Number(d))
  return { year, day: Math.round((target - startOfYear) / 86400000) }
}

export function yearDayToIsoDate(year: number, day: number): string {
  const date = new Date(Date.UTC(year, 0, 1) + day * 86400000)
  return date.toISOString().slice(0, 10)
}

export function encodeYearBitmap(days: Iterable<number>): string {
  const bytes = new Uint8Array(YEAR_BITMAP_BYTES)
  for (const day of days) {
    if (day < 0 || day >= YEAR_BITMAP_BYTES * 8) continue
    bytes[day >> 3] |= 1 << (day & 7)
  }
  return Buffer.from(bytes).toString('base64')
}

export function decodeYearBitmap(base64: string): Set<number> {
  const bytes = Buffer.from(base64, 'base64')
  const days = new Set<number>()
  for (let i = 0; i < bytes.length * 8; i++) {
    if (bytes[i >> 3] & (1 << (i & 7))) days.add(i)
  }
  return days
}

function propertyPrefix(logType: PracticeLogType): string {
  return `practice_${logType}_`
}

export function propertyKeyForYear(logType: PracticeLogType, year: number): string {
  return `${propertyPrefix(logType)}${year}`
}

export function yearFromPropertyKey(logType: PracticeLogType, key: string): number | null {
  const prefix = propertyPrefix(logType)
  if (!key.startsWith(prefix)) return null
  const year = Number(key.slice(prefix.length))
  return Number.isInteger(year) ? year : null
}
