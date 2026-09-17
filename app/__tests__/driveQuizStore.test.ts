import { describe, it, expect } from 'vitest'
import { parseQuizFile } from '../lib/driveQuizStore'

describe('parseQuizFile', () => {
  it('pairs a Dutch list with a matching English list by sentence number', () => {
    const text = [
      '1. Een zin in het Nederlands.\\',
      '2. Nog een zin.',
      '',
      '1. A sentence in Dutch.',
      '2. Another sentence.',
    ].join('\n')

    expect(parseQuizFile(text)).toEqual([
      { dutch: 'Een zin in het Nederlands.', english: 'A sentence in Dutch.' },
      { dutch: 'Nog een zin.', english: 'Another sentence.' },
    ])
  })

  it('ignores blank lines and non-numbered lines', () => {
    const text = '1. Hallo.\n\nRandom note\n1. Hello.\n'
    expect(parseQuizFile(text)).toEqual([{ dutch: 'Hallo.', english: 'Hello.' }])
  })

  it('throws when the two lists have different lengths', () => {
    const text = '1. Een.\n2. Twee.\n1. One.'
    expect(() => parseQuizFile(text)).toThrow()
  })

  it('throws when there is only one numbered list', () => {
    const text = '1. Een.\n2. Twee.'
    expect(() => parseQuizFile(text)).toThrow()
  })
})
