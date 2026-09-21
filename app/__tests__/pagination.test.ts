import { describe, it, expect } from 'vitest'
import { buildPageList } from '../lib/pagination'

describe('buildPageList', () => {
  it('shows every page when there are few enough (no ellipsis needed)', () => {
    expect(buildPageList(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('shows a leading run + ellipsis + last page when near the start', () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20])
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20])
  })

  it('shows first page + ellipsis + trailing run when near the end', () => {
    expect(buildPageList(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20])
    expect(buildPageList(19, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20])
  })

  it('shows first + ellipsis + neighbors + ellipsis + last when in the middle', () => {
    expect(buildPageList(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20])
  })

  it('caps the total number of rendered items regardless of how many pages there are (mobile-safe)', () => {
    expect(buildPageList(50, 1000)).toHaveLength(7)
    expect(buildPageList(1, 1000)).toHaveLength(7)
  })

  it('handles a single page', () => {
    expect(buildPageList(1, 1)).toEqual([1])
  })
})
