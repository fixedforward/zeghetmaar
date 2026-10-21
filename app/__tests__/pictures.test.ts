import { describe, it, expect } from 'vitest'
import { findMeaningPictureId, findPictureForMeaning, findPictureForPhrase, matchKey, pictureUrl } from '../lib/pictures'

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

describe('findMeaningPictureId', () => {
  const files = [
    { id: 'm', name: 'bank$bench.png' },
    { id: 'p', name: 'bank.png' },
  ]

  it('prefers the picture for that meaning', () => {
    expect(findMeaningPictureId(files, 'bank', 'bench', 1)).toBe('m')
  })

  it('falls back to the saved or phrase picture for the first meaning only', () => {
    expect(findMeaningPictureId(files, 'bank', 'bank', 0, 'saved')).toBe('saved')
    expect(findMeaningPictureId(files, 'bank', 'bank', 0)).toBe('p')
    expect(findMeaningPictureId(files, 'bank', 'shore', 1)).toBeUndefined()
  })
})

describe('sentences as phrase or meaning', () => {
  it('matchKey keeps only letters and digits, in lower case, with single spaces', () => {
    expect(matchKey("  I'm  tired. ")).toBe('im tired')
    expect(matchKey('Hoe gaat het?')).toBe('hoe gaat het')
    expect(matchKey('Wat een café!')).toBe('wat een café')
  })

  it('finds a phrase picture whose name leaves out the punctuation of the sentence', () => {
    const files = [{ id: 's', name: 'hoe gaat het.png' }]
    expect(findPictureForPhrase(files, 'Hoe gaat het?')?.id).toBe('s')
  })

  it('finds a meaning picture when both the phrase and the meaning are sentences', () => {
    const files = [{ id: 'm', name: 'Ik ben het ermee eens$I agree with that.jpg' }]
    expect(findPictureForMeaning(files, 'Ik ben het ermee eens.', "I agree with that!")?.id).toBe('m')
  })

  it('keeps a dot inside the sentence and only strips a real image extension', () => {
    const files = [{ id: 'd', name: 'Hij is 3.5 jaar$He is 3.5 years.png' }]
    expect(findPictureForMeaning(files, 'Hij is 3.5 jaar.', 'He is 3.5 years.')?.id).toBe('d')
    expect(findPictureForPhrase([{ id: 'x', name: 'Het kost 3.50' }], 'Het kost 3.50')?.id).toBe('x')
  })
})
