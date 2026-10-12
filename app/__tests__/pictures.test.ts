import { describe, it, expect } from 'vitest'
import { findPictureForPhrase, pictureUrl } from '../lib/pictures'

const pictures = [
  { id: 'a', name: 'fiets.png' },
  { id: 'b', name: 'Op de hoogte zijn.jpg' },
]

describe('pictureUrl', () => {
  it('points at the picture route', () => {
    expect(pictureUrl('abc_-1')).toBe('/api/pictures/abc_-1')
  })
})

describe('findPictureForPhrase', () => {
  it('matches the file name without extension, ignoring case and spaces around the phrase', () => {
    expect(findPictureForPhrase(pictures, '  op de hoogte zijn ')?.id).toBe('b')
    expect(findPictureForPhrase(pictures, 'Fiets')?.id).toBe('a')
  })

  it('returns undefined for no match or an empty phrase', () => {
    expect(findPictureForPhrase(pictures, 'auto')).toBeUndefined()
    expect(findPictureForPhrase(pictures, ' ')).toBeUndefined()
  })
})
