import { describe, it, expect } from 'vitest'
import { addPracticedSentence, countPracticedOn, parsePracticedToday } from '../lib/practicedToday'

describe('practicedToday', () => {
  it('counts each sentence once per day', () => {
    let practiced = addPracticedSentence(null, '2026-10-19', 'zin 1')
    practiced = addPracticedSentence(practiced, '2026-10-19', 'zin 2')
    practiced = addPracticedSentence(practiced, '2026-10-19', 'zin 1')

    expect(countPracticedOn(practiced, '2026-10-19')).toBe(2)
  })

  it('starts at 0 again on a new day', () => {
    const yesterday = addPracticedSentence(null, '2026-10-18', 'zin 1')

    expect(countPracticedOn(yesterday, '2026-10-19')).toBe(0)
    expect(addPracticedSentence(yesterday, '2026-10-19', 'zin 2')).toEqual({ date: '2026-10-19', sentences: ['zin 2'] })
  })

  it('ignores missing or broken stored data', () => {
    expect(parsePracticedToday(null)).toBeNull()
    expect(parsePracticedToday('{kapot')).toBeNull()
    expect(parsePracticedToday('{"date":"2026-10-19"}')).toBeNull()
    expect(parsePracticedToday('{"date":"2026-10-19","sentences":["a",3]}')).toEqual({ date: '2026-10-19', sentences: ['a'] })
  })
})
