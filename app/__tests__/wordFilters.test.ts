import { describe, it, expect } from 'vitest'
import { filterWordsByDaysSinceAdded } from '../lib/wordFilters'
import type { WordEntry } from '../types'

const make = (id: string, createdAt?: string): WordEntry => ({
  id, word: `w${id}`, meanings: [{ translation: 't', examples: [] }], createdAt, updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('filterWordsByDaysSinceAdded', () => {
  const NOW = new Date('2024-01-10T00:00:00.000Z').getTime()

  it('returns every word unchanged when the range is null', () => {
    const words = [make('1', '2020-01-01T00:00:00.000Z'), make('2', undefined)]
    expect(filterWordsByDaysSinceAdded(words, null, NOW)).toEqual(words)
  })

  it('keeps only words added within the day range', () => {
    const today = make('1', '2024-01-09T12:00:00.000Z') // half a day ago
    const twoDaysAgo = make('2', '2024-01-08T00:00:00.000Z')
    const nineDaysAgo = make('3', '2024-01-01T00:00:00.000Z')

    expect(filterWordsByDaysSinceAdded([today, twoDaysAgo, nineDaysAgo], { from: 1, to: 3 }, NOW)).toEqual([twoDaysAgo])
  })

  it('puts a word exactly on a boundary in the later range only', () => {
    const threeDaysAgo = make('1', '2024-01-07T00:00:00.000Z')

    expect(filterWordsByDaysSinceAdded([threeDaysAgo], { from: 1, to: 3 }, NOW)).toEqual([])
    expect(filterWordsByDaysSinceAdded([threeDaysAgo], { from: 3, to: 7 }, NOW)).toEqual([threeDaysAgo])
  })

  it('includes a word added just now in the vandaag range', () => {
    const justNow = make('1', '2024-01-10T00:00:00.000Z')
    expect(filterWordsByDaysSinceAdded([justNow], { from: 0, to: 1 }, NOW)).toEqual([justNow])
  })

  it('excludes a word with no createdAt once a filter is set', () => {
    const noDate = make('1', undefined)
    expect(filterWordsByDaysSinceAdded([noDate], { from: 0, to: 7 }, NOW)).toEqual([])
  })
})
