import { describe, it, expect } from 'vitest'
import { buildClozeQuestions, maskWord } from '../lib/cloze'
import type { WordEntry } from '../types'

const makeWord = (examples: string[] = [], overrides: Partial<WordEntry> = {}): WordEntry => ({
  id: '1',
  word: 'hoewel',
  meanings: [{ translation: 'although', examples }],
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('maskWord', () => {
  it('replaces the word with a blank, case-insensitively', () => {
    expect(maskWord('Hoewel het regende, gingen we wandelen.', 'hoewel')).toBe(
      '____ het regende, gingen we wandelen.'
    )
  })

  it('returns the sentence unchanged when the word is not present', () => {
    expect(maskWord('Dit is een zin.', 'hoewel')).toBe('Dit is een zin.')
  })
})

describe('buildClozeQuestions', () => {
  it('builds a question for a word with an example containing it', () => {
    const words = [makeWord(['Hoewel het regende, gingen we wandelen.'])]
    const questions = buildClozeQuestions(words)
    expect(questions).toEqual([
      { phraseId: '1', word: 'hoewel', translation: 'although', sentence: 'Hoewel het regende, gingen we wandelen.' },
    ])
  })

  it('skips words with no examples', () => {
    const words = [makeWord([])]
    expect(buildClozeQuestions(words)).toEqual([])
  })

  it('skips words whose examples never actually contain the word', () => {
    const words = [makeWord(['Dit voorbeeld bevat het woord niet.'])]
    expect(buildClozeQuestions(words)).toEqual([])
  })

  it('picks the first example that contains the word when multiple exist', () => {
    const words = [makeWord(['Geen match hier.', 'Hoewel het laat was, bleven we.'])]
    expect(buildClozeQuestions(words)[0].sentence).toBe('Hoewel het laat was, bleven we.')
  })

  it('picks the first meaning with a matching example when meanings differ', () => {
    const words = [makeWord([], {
      meanings: [
        { translation: 'although', examples: ['Geen match hier.'] },
        { translation: 'even though', examples: ['Hoewel het laat was, bleven we.'] },
      ],
    })]
    expect(buildClozeQuestions(words)).toEqual([
      { phraseId: '1', word: 'hoewel', translation: 'even though', sentence: 'Hoewel het laat was, bleven we.' },
    ])
  })
})
