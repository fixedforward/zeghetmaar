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
