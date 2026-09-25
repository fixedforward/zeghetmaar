import { describe, it, expect, vi, afterEach } from 'vitest'
import { shuffleArray, weightedShuffleArray } from '../lib/shuffle'

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

describe('weightedShuffleArray', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the same elements (as a multiset)', () => {
    const items = ['a', 'b', 'c', 'd']
    const shuffled = weightedShuffleArray(items, () => 1)
    expect([...shuffled].sort()).toEqual([...items].sort())
  })

  it('does not mutate the original array', () => {
    const items = [1, 2, 3]
    const original = [...items]
    weightedShuffleArray(items, () => 1)
    expect(items).toEqual(original)
  })

  it('picks a heavily-weighted item first far more often than a low-weight one', () => {
    const items = ['weak', 'strong']
    const weight = (item: string) => (item === 'weak' ? 100 : 1)

    let weakFirstCount = 0
    const runs = 200
    for (let i = 0; i < runs; i++) {
      if (weightedShuffleArray(items, weight)[0] === 'weak') weakFirstCount++
    }

    // With a 100:1 weight ratio, "weak" should end up first the vast majority
    // of the time — allow generous slack to avoid a flaky test.
    expect(weakFirstCount).toBeGreaterThan(runs * 0.8)
  })

  it('is deterministic given a fixed Math.random sequence', () => {
    const items = ['a', 'b', 'c']
    const randomValues = [0.9, 0.5, 0.1]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[call++])

    // Equal weights, so order is driven purely by the mocked random sequence:
    // smaller random value -> larger -ln(random) -> larger key -> sorts later.
    expect(weightedShuffleArray(items, () => 1)).toEqual(['a', 'b', 'c'])
  })
})
