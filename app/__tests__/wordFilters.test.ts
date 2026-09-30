import { describe, it, expect } from 'vitest'
import { filterWordsByDaysSinceAdded } from '../lib/wordFilters'
import type { WordEntry } from '../types'

const make = (id: string, createdAt?: string): WordEntry => ({
  id, word: `w${id}`, meanings: [{ translation: 't', examples: [] }], createdAt, updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('filterWordsByDaysSinceAdded', () => {
  const NOW = new Date('2024-01-10T00:00:00.000Z').getTime()

  it('returns every word unchanged when days is null', () => {
    const words = [make('1', '2020-01-01T00:00:00.000Z'), make('2', undefined)]
    expect(filterWordsByDaysSinceAdded(words, null, NOW)).toEqual(words)
  })

  it('keeps only words created within the last N days', () => {
    const recent = make('1', '2024-01-09T00:00:00.000Z') // 1 day ago
    const old = make('2', '2024-01-01T00:00:00.000Z') // 9 days ago

    expect(filterWordsByDaysSinceAdded([recent, old], 2, NOW)).toEqual([recent])
  })

  it('includes a word created exactly at the cutoff', () => {
    const atCutoff = make('1', '2024-01-08T00:00:00.000Z') // exactly 2 days ago
    expect(filterWordsByDaysSinceAdded([atCutoff], 2, NOW)).toEqual([atCutoff])
  })

  it('excludes a word with no createdAt once a filter is set', () => {
    const noDate = make('1', undefined)
    expect(filterWordsByDaysSinceAdded([noDate], 7, NOW)).toEqual([])
  })
})
