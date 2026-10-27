import { describe, it, expect } from 'vitest'
import { mergeIslandOptions, parseIslandOptions } from '../lib/languageIslands'

describe('parseIslandOptions', () => {
  it('gives one option per non-empty line', () => {
    expect(parseIslandOptions('Ik werk vrijdags thuis.\n\nOp vrijdag werk ik thuis.\n')).toEqual([
      'Ik werk vrijdags thuis.',
      'Op vrijdag werk ik thuis.',
    ])
  })

  it('strips numbering and bullets', () => {
    expect(parseIslandOptions('1. Een\n2) Twee\n- Drie\n* Vier\n• Vijf')).toEqual(['Een', 'Twee', 'Drie', 'Vier', 'Vijf'])
  })
})

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
