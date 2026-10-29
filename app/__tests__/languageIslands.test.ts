import { describe, it, expect } from 'vitest'
import { filterIslands, mergeIslandOptions, pickPracticeIslands } from '../lib/languageIslands'

describe('mergeIslandOptions', () => {
  it('keeps the existing options first and skips duplicates, ignoring case', () => {
    expect(mergeIslandOptions(['Ik werk thuis.'], ['ik werk thuis.', 'Ik zit thuis te werken.'])).toEqual([
      'Ik werk thuis.',
      'Ik zit thuis te werken.',
    ])
  })

  it('trims options and drops empty ones', () => {
    expect(mergeIslandOptions([], ['  Hoi  ', '   '])).toEqual(['Hoi'])
  })
})

describe('filterIslands', () => {
  const later = { english: 'See you later', options: ['Tot straks.'] }
  const bored = { english: "I'm getting bored with it", options: ['Ik raak het beu.'] }

  it('keeps every island for an empty or blank query', () => {
    expect(filterIslands([later, bored], '  ')).toEqual([later, bored])
  })

  it('matches the English phrase, ignoring case', () => {
    expect(filterIslands([later, bored], 'BORED')).toEqual([bored])
  })

  it('matches a Dutch option', () => {
    expect(filterIslands([later, bored], 'straks')).toEqual([later])
  })
})

describe('pickPracticeIslands', () => {
  const withOptions = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, options: ['x'] }))
  const empty = { id: 'empty', options: [] }

  it('picks at most count islands, each once', () => {
    const picked = pickPracticeIslands(withOptions, 5)

    expect(picked).toHaveLength(5)
    expect(new Set(picked.map(i => i.id)).size).toBe(5)
  })

  it('leaves out islands without options', () => {
    expect(pickPracticeIslands([empty, withOptions[0]], 5)).toEqual([withOptions[0]])
  })
})
