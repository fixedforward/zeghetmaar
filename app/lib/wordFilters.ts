import type { WordEntry } from '../types'

// Keeps only words created within the last `days` days (inclusive), so an
// exercise can focus on recently added vocabulary. `days: null` disables the
// filter. `now` is injectable for deterministic tests. A word with no
// createdAt (shouldn't happen for real data) is excluded once a filter is set.
export function filterWordsByDaysSinceAdded(words: WordEntry[], days: number | null, now: number = Date.now()): WordEntry[] {
  if (days === null) return words
  const cutoff = now - days * 86400000
  return words.filter(w => w.createdAt !== undefined && new Date(w.createdAt).getTime() >= cutoff)
}
