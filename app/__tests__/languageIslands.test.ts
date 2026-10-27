import { describe, it, expect } from 'vitest'
import { mergeIslandOptions } from '../lib/languageIslands'

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
