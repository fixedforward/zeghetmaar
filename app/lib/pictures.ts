import type { PictureFile } from '../types'

export function pictureUrl(fileId: string): string {
  return `/api/pictures/${encodeURIComponent(fileId)}`
}

// Only a real image extension, so a sentence like "Hij is 3.5 jaar" keeps its ".5 jaar".
function stripExtension(name: string): string {
  return name.replace(/\.(png|jpe?g|gif|webp|avif|heic|svg|bmp|tiff?)$/i, '')
}

// A phrase or meaning can be a whole sentence, and a file name often can't hold its
// punctuation ("?", ":", "/") or the user leaves it out. So compare only letters and digits:
// "Hoe gaat het?" matches "hoe gaat het.png", and "I'm tired." matches "Im tired".
export function matchKey(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).join(' ')
}

// A picture named after the phrase (`op de hoogte zijn.png` for "op de hoogte zijn").
export function findPictureForPhrase(pictures: PictureFile[], phrase: string): PictureFile | undefined {
  const key = matchKey(phrase)
  if (!key) return undefined
  return pictures.find(p => matchKey(stripExtension(p.name)) === key)
}

// One picture per meaning: phrase$translation.png.
export function findPictureForMeaning(pictures: PictureFile[], phrase: string, meaning: string): PictureFile | undefined {
  const phraseKey = matchKey(phrase)
  const meaningKey = matchKey(meaning)
  if (!phraseKey || !meaningKey) return undefined
  return pictures.find(p => {
    const name = stripExtension(p.name)
    const separator = name.indexOf('$')
    return separator >= 0 && matchKey(name.slice(0, separator)) === phraseKey
      && matchKey(name.slice(separator + 1)) === meaningKey
  })
}

// The picture for one meaning of a phrase: its own phrase$meaning picture, or for the first
// meaning the phrase's saved picture or a picture named after the phrase.
export function findMeaningPictureId(
  pictures: PictureFile[], phrase: string, meaning: string, index: number, savedPicture?: string | null,
): string | undefined {
  return findPictureForMeaning(pictures, phrase, meaning)?.id
    ?? (index === 0 ? savedPicture ?? findPictureForPhrase(pictures, phrase)?.id : undefined)
}
