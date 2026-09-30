import { describe, it, expect } from 'vitest'
import { buildQuizPairsFromWords, filterWordsForQuiz } from '../lib/wordQuiz'
import type { WordEntry } from '../types'

const now = '2024-01-01T00:00:00.000Z'

describe('buildQuizPairsFromWords', () => {
  it('builds one pair per meaning', () => {
    const words: WordEntry[] = [
      {
        id: '1', word: 'toekennen', updatedAt: now,
        meanings: [
          { translation: 'to assign', examples: [] },
          { translation: 'to award', examples: [] },
        ],
      },
      {
        id: '2', word: 'gezellig', updatedAt: now,
        meanings: [{ translation: 'cozy', examples: [] }],
      },
    ]

    expect(buildQuizPairsFromWords(words)).toEqual([
      { dutch: 'toekennen', english: 'to assign', phraseId: '1' },
      { dutch: 'toekennen', english: 'to award', phraseId: '1' },
      { dutch: 'gezellig', english: 'cozy', phraseId: '2' },
    ])
  })

  it('returns an empty array for an empty word list', () => {
    expect(buildQuizPairsFromWords([])).toEqual([])
  })
})

describe('filterWordsForQuiz', () => {
  const make = (id: string, beheersing: 1 | 2 | 3 | undefined, createdAt: string): WordEntry => ({
    id, word: `w${id}`, meanings: [{ translation: 't', examples: [] }], beheersing, createdAt, updatedAt: now,
  })

  it('filters by beheersing level, treating a missing level as 1', () => {
    const words = [make('1', 1, '2024-01-01'), make('2', 2, '2024-01-02'), make('3', undefined, '2024-01-03')]

    const result = filterWordsForQuiz(words, { beheersingLevels: new Set([1]), recentCount: null })

    expect(result.map(w => w.id)).toEqual(['1', '3'])
  })

  it('keeps every word when all beheersing levels are selected', () => {
    const words = [make('1', 1, '2024-01-01'), make('2', 3, '2024-01-02')]

    const result = filterWordsForQuiz(words, { beheersingLevels: new Set([1, 2, 3]), recentCount: null })

    expect(result).toHaveLength(2)
  })

  it('limits to the N most recently created words when recentCount is set', () => {
    const words = [
      make('1', 1, '2024-01-01'),
      make('2', 1, '2024-01-03'),
      make('3', 1, '2024-01-02'),
    ]

    const result = filterWordsForQuiz(words, { beheersingLevels: new Set([1, 2, 3]), recentCount: 2 })

    expect(result.map(w => w.id)).toEqual(['2', '3'])
  })

  it('applies the beheersing filter before the recentCount cutoff', () => {
    const words = [
      make('1', 2, '2024-01-04'), // newest, but wrong beheersing
      make('2', 1, '2024-01-03'),
      make('3', 1, '2024-01-02'),
      make('4', 1, '2024-01-01'),
    ]

    const result = filterWordsForQuiz(words, { beheersingLevels: new Set([1]), recentCount: 2 })

    expect(result.map(w => w.id)).toEqual(['2', '3'])
  })
})
