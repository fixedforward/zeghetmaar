import { describe, it, expect } from 'vitest'
import { buildClozeQuestions, buildFlashcards, maskWord } from '../lib/cloze'
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

  it('skips meanings without a matching example', () => {
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

  it('builds one question per meaning that has a matching example', () => {
    const words = [makeWord([], {
      meanings: [
        { translation: 'although', examples: ['Hoewel het regende, gingen we wandelen.'] },
        { translation: 'even though', examples: ['Hoewel het laat was, bleven we.'] },
      ],
    })]
    expect(buildClozeQuestions(words)).toEqual([
      { phraseId: '1', word: 'hoewel', translation: 'although', sentence: 'Hoewel het regende, gingen we wandelen.' },
      { phraseId: '1', word: 'hoewel', translation: 'even though', sentence: 'Hoewel het laat was, bleven we.' },
    ])
  })
})

describe('buildFlashcards', () => {
  it('builds one card per phrase with all meanings, even without examples', () => {
    const word = makeWord([], {
      meanings: [
        { translation: 'although', examples: [] },
        { translation: 'even though', examples: ['Hoewel het regende.'] },
      ],
    })
    expect(buildFlashcards([word])).toEqual([
      { phraseId: '1', word: 'hoewel', translation: 'although · even though', sentence: 'Hoewel het regende.' },
    ])
  })

  it('skips phrases without meanings', () => {
    expect(buildFlashcards([makeWord([], { meanings: [] })])).toEqual([])
  })
})
