import type { PictureFile } from '../types'

export function pictureUrl(fileId: string): string {
  return `/api/pictures/${encodeURIComponent(fileId)}`
}

function normalizeName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim().toLowerCase()
}

// A picture named after the phrase (`op de hoogte zijn.png` for "op de hoogte zijn").
export function findPictureForPhrase(pictures: PictureFile[], phrase: string): PictureFile | undefined {
  const key = phrase.trim().toLowerCase()
  if (!key) return undefined
  return pictures.find(p => normalizeName(p.name) === key)
}

// One picture per meaning: phrase$translation.png.
export function findPictureForMeaning(pictures: PictureFile[], phrase: string, meaning: string): PictureFile | undefined {
  const phraseKey = phrase.trim().toLowerCase()
  const meaningKey = meaning.trim().toLowerCase()
  if (!phraseKey || !meaningKey) return undefined
  return pictures.find(p => {
    const name = normalizeName(p.name)
    const separator = name.indexOf('$')
    return separator >= 0 && name.slice(0, separator).trim() === phraseKey
      && name.slice(separator + 1).trim() === meaningKey
  })
}
