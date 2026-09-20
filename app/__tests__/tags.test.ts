import { describe, it, expect } from 'vitest'
import { getAllTags } from '../lib/tags'

describe('getAllTags', () => {
  it('returns unique tags sorted alphabetically', () => {
    const entries = [
      { tags: ['werk', 'reizen'] },
      { tags: ['reizen'] },
      { tags: ['eten'] },
    ]
    expect(getAllTags(entries)).toEqual(['eten', 'reizen', 'werk'])
  })

  it('ignores entries without tags', () => {
    const entries = [{ tags: ['werk'] }, {}, { tags: undefined }]
    expect(getAllTags(entries)).toEqual(['werk'])
  })

  it('returns an empty array when no entries have tags', () => {
    expect(getAllTags([{}, {}])).toEqual([])
  })
})
