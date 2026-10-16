import { describe, it, expect } from 'vitest'
import { insertLater, randomRequeueGap } from '../lib/requeue'

describe('insertLater', () => {
  it('inserts the item gap places after the index', () => {
    expect(insertLater(['a', 'b', 'c', 'd', 'e'], 0, 2, 'a')).toEqual(['a', 'b', 'c', 'a', 'd', 'e'])
  })

  it('appends when the gap runs past the end', () => {
    expect(insertLater(['a', 'b'], 1, 5, 'b')).toEqual(['a', 'b', 'b'])
  })
})

describe('randomRequeueGap', () => {
  it('leaves 2 to 5 cards in between', () => {
    for (let i = 0; i < 50; i++) {
      const gap = randomRequeueGap()
      expect(gap).toBeGreaterThanOrEqual(2)
      expect(gap).toBeLessThanOrEqual(5)
    }
  })
})
