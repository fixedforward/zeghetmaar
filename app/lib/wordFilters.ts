import type { WordEntry } from '../types'

// How long ago a word was added, in days: `from` inclusive, `to` exclusive, so
// a word exactly 3 days old lands in 3–7, not also in 1–3.
export interface DayRange {
  from: number
  to: number
}

export const DAY_RANGE_OPTIONS: { range: DayRange; label: string }[] = [
  { range: { from: 0, to: 1 }, label: 'vandaag' },
  { range: { from: 1, to: 3 }, label: '1–3 dagen geleden' },
  { range: { from: 3, to: 7 }, label: '3–7 dagen geleden' },
  { range: { from: 7, to: 14 }, label: '7–14 dagen geleden' },
  { range: { from: 14, to: 21 }, label: '14–21 dagen geleden' },
]

export const DEFAULT_DAY_RANGE: DayRange = DAY_RANGE_OPTIONS[1].range

// Keeps only words added within `range` days ago, so an exercise can focus on a
// batch of vocabulary. `range: null` disables the filter. `now` is injectable
// for deterministic tests. A word with no createdAt (shouldn't happen for real
// data) is excluded once a filter is set.
export function filterWordsByDaysSinceAdded(words: WordEntry[], range: DayRange | null, now: number = Date.now()): WordEntry[] {
  if (range === null) return words
  const newest = now - range.from * 86400000
  const oldest = now - range.to * 86400000
  return words.filter(w => {
    if (w.createdAt === undefined) return false
    const created = new Date(w.createdAt).getTime()
    return created > oldest && created <= newest
  })
}
