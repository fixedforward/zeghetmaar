import { config } from './config'
import { listDriveFolderFilesAsync, type DriveFile } from './driveArticleStore'
import type { PictureFile } from '../types'

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
