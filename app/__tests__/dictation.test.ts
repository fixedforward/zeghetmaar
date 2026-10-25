import { describe, it, expect } from 'vitest'
import { compareDictation } from '../lib/dictation'

const missed = (typed: string, target: string) =>
  compareDictation(typed, target).words.filter(w => !w.heard).map(w => w.text)

describe('compareDictation', () => {
  it('is correct when every word is typed, ignoring case and punctuation', () => {
    const result = compareDictation('dat zie je wel vaker', 'Dat zie je, wel vaker.')

    expect(result.correct).toBe(true)
    expect(result.words.map(w => w.text)).toEqual(['Dat', 'zie', 'je,', 'wel', 'vaker.'])
  })

  it('marks the words I missed or got wrong', () => {
    expect(missed('dat zie wel vaaker', 'Dat zie je wel vaker.')).toEqual(['je', 'vaker.'])
    expect(compareDictation('dat zie wel vaaker', 'Dat zie je wel vaker.').correct).toBe(false)
  })

  it('matches words in order, so a repeated word is only counted once', () => {
    expect(missed('je', 'je ziet je')).toEqual(['ziet', 'je'])
  })

  it('is wrong when I typed an extra word, even if every real word is there', () => {
    const result = compareDictation('dat zie je nu wel vaker', 'Dat zie je wel vaker.')

    expect(result.words.every(w => w.heard)).toBe(true)
    expect(result.correct).toBe(false)
  })

  it('does not ask for words that are only punctuation', () => {
    expect(compareDictation('ja hoor', 'Ja — hoor.').correct).toBe(true)
  })
})
