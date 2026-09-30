import type { WordEntry, QuizPair } from '../types'

// One quiz pair per meaning, so a phrase with several distinct senses (e.g.
// "toekennen" = to assign / to award) gets reviewed on each of them.
export function buildQuizPairsFromWords(words: WordEntry[]): QuizPair[] {
  return words.flatMap(w => w.meanings.map(m => ({ dutch: w.word, english: m.translation, phraseId: w.id })))
}

export interface WordQuizFilters {
  beheersingLevels: Set<1 | 2 | 3>
  // null = no limit; otherwise keep only the N most recently created words.
  recentCount: number | null
}

// A word without a beheersing level counts as level 1 (weak), matching the
// default new words get elsewhere in the app. A word without a createdAt
// (shouldn't happen for real data, but keeps this total) sorts as oldest.
export function filterWordsForQuiz(words: WordEntry[], filters: WordQuizFilters): WordEntry[] {
  const byBeheersing = words.filter(w => filters.beheersingLevels.has(w.beheersing ?? 1))
  if (filters.recentCount === null) return byBeheersing
  return [...byBeheersing]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, filters.recentCount)
}
