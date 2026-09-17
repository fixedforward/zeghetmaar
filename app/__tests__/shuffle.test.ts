import { describe, it, expect } from 'vitest'
import { shuffleArray } from '../lib/shuffle'

describe('shuffleArray', () => {
  it('keeps the same length', () => {
    const items = [1, 2, 3, 4, 5]
    expect(shuffleArray(items)).toHaveLength(items.length)
  })

  it('keeps the same elements (as a multiset)', () => {
    const items = ['a', 'b', 'c', 'd']
    const shuffled = shuffleArray(items)
    expect([...shuffled].sort()).toEqual([...items].sort())
  })

  it('does not mutate the original array', () => {
    const items = [1, 2, 3]
    const original = [...items]
    shuffleArray(items)
    expect(items).toEqual(original)
  })
})
