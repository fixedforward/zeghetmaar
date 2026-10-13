import { describe, it, expect } from 'vitest'
import { findPictureForMeaning, findPictureForPhrase, pictureUrl } from '../lib/pictures'

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

 describe('findPictureForMeaning', () => {
  const files = [
    { id: '1', name: 'eveneens$likewise.png' },
    { id: '2', name: 'eveneens$also.jpg' },
    { id: '3', name: 'eveneens.png' },
  ]
  it('matches the phrase and meaning independently, ignoring case and surrounding spaces', () => {
    expect(findPictureForMeaning(files, ' Eveneens ', ' LIKEWISE ')?.id).toBe('1')
    expect(findPictureForMeaning(files, 'eveneens', 'also')?.id).toBe('2')
    expect(findPictureForMeaning([{ id: '4', name: 'eveneens $ likewise.webp' }], 'eveneens', 'likewise')?.id).toBe('4')
  })
  it('does not match another meaning, phrase, or an empty meaning', () => {
    expect(findPictureForMeaning(files, 'eveneens', 'unknown')).toBeUndefined()
    expect(findPictureForMeaning(files, 'anders', 'likewise')).toBeUndefined()
    expect(findPictureForMeaning(files, 'eveneens', '')).toBeUndefined()
  })
 })
