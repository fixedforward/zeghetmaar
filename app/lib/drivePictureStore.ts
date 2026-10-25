import { config } from './config'
import { getDriveClient } from './driveStore'
import { listDriveFolderFilesAsync, type DriveFile } from './driveArticleStore'
import { findMeaningPictureId } from './pictures'
import type { Phrase, PictureFile } from '../types'

export function getPicturesFolderId(): string | undefined {
  return config.database.googlePicturesFolder?.folderId || undefined
}

export function isImageMimeType(mimeType: string | null | undefined): boolean {
  return !!mimeType && mimeType.startsWith('image/')
}

export function toPictureFiles(files: DriveFile[]): PictureFile[] {
  return files
    .filter((f): f is DriveFile & { id: string; name: string } => !!f.id && !!f.name && isImageMimeType(f.mimeType))
    .map(f => ({ id: f.id, name: f.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}

export async function listPicturesAsync(folderId: string): Promise<PictureFile[]> {
  return toPictureFiles(await listDriveFolderFilesAsync(folderId))
}

type PhrasePictures = Pick<Phrase, 'word' | 'meanings' | 'picture'>

// The pictures shown for a phrase's meanings, as Cloze and PhraseDetailModal pick them.
function phrasePictureIds(pictures: PictureFile[], phrase: PhrasePictures): string[] {
  return phrase.meanings
    .map((m, i) => findMeaningPictureId(pictures, phrase.word, m.translation, i, phrase.picture))
    .filter((id): id is string => !!id)
}

// The pictures of a deleted phrase that no other phrase still shows.
export function picturesOnlyUsedBy(pictures: PictureFile[], removed: PhrasePictures, remaining: PhrasePictures[]): string[] {
  const stillUsed = new Set(remaining.flatMap(p => phrasePictureIds(pictures, p)))
  return [...new Set(phrasePictureIds(pictures, removed))].filter(id => !stillUsed.has(id))
}

// Only the owner can trash a file in My Drive, and pictures are uploaded by hand; when
// trashing fails, taking the picture out of the pictures folder still hides it from the app.
async function removePictureAsync(fileId: string, folderId: string): Promise<void> {
  const drive = getDriveClient()
  try {
    await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
  } catch {
    await drive.files.update({ fileId, removeParents: folderId, supportsAllDrives: true })
  }
}

export async function deletePhrasePicturesAsync(removed: PhrasePictures, remaining: PhrasePictures[]): Promise<void> {
  const folderId = getPicturesFolderId()
  if (!folderId) return
  const ids = picturesOnlyUsedBy(await listPicturesAsync(folderId), removed, remaining)
  const results = await Promise.allSettled(ids.map(id => removePictureAsync(id, folderId)))
  results.forEach((result, i) => {
    if (result.status === 'rejected') console.error(`[drivePictureStore] Could not remove picture ${ids[i]}:`, result.reason)
  })
}
