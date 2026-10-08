import type { Readable } from 'stream'
import { config } from './config'
import { getDriveClient } from './driveStore'
import { readDriveTextFileAsync } from './driveQuizStore'
import { FOLDER_MIME, listDriveFolderFilesAsync, type DriveFile } from './driveArticleStore'
import { parseSrt } from './srt'
import type { ListeningLesson, ListeningTreeFolder } from '../types'

const MAX_TREE_DEPTH = 5

type NamedDriveFile = DriveFile & { id: string; name: string }

export function getListeningRootFolderId(): string | undefined {
  return config.database.googleListeningFolder?.folderId || undefined
}

export function isMediaMimeType(mimeType: string | null | undefined): boolean {
  return !!mimeType && (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))
}

export function isPlayableFileName(name: string): boolean {
  return /\.(mp3|mp4)$/i.test(name)
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

// The transcript of `Les 14.mp4` is `Les 14.srt` in the same folder.
export function subtitleFileName(mediaName: string): string {
  return `${baseName(mediaName)}.srt`
}

function findSubtitleFile(files: NamedDriveFile[], mediaName: string): NamedDriveFile | undefined {
  const base = baseName(mediaName)
  return files.find(f => baseName(f.name) === base && /\.srt$/i.test(f.name))
}

function namedFiles(files: DriveFile[]): NamedDriveFile[] {
  return files.filter((f): f is NamedDriveFile => !!f.id && !!f.name)
}

async function buildTreeAsync(folderId: string, name: string, depth: number): Promise<ListeningTreeFolder> {
  const items = namedFiles(await listDriveFolderFilesAsync(folderId))
  const subfolders = depth < MAX_TREE_DEPTH
    ? await Promise.all(items.filter(f => f.mimeType === FOLDER_MIME).map(f => buildTreeAsync(f.id, f.name, depth + 1)))
    : []
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'nl')
  return {
    id: folderId,
    name,
    folders: subfolders.filter(f => f.folders.length > 0 || f.files.length > 0).sort(byName),
    files: items
      .filter(f => isPlayableFileName(f.name))
      .map(f => ({ id: f.id, name: f.name, hasSubtitles: !!findSubtitleFile(items, f.name) }))
      .sort(byName),
  }
}

// The whole tree in one request, keeping only .mp3/.mp4 files and the folders that hold
// one somewhere below them.
export function getListeningTreeAsync(rootFolderId: string): Promise<ListeningTreeFolder> {
  return buildTreeAsync(rootFolderId, '', 0)
}

// The folder id is passed in because Drive doesn't return `parents` for files the service
// account can only reach through a shared link.
export async function getListeningLessonAsync(folderId: string, mediaFileId: string): Promise<ListeningLesson | null> {
  const files = namedFiles(await listDriveFolderFilesAsync(folderId))
  const media = files.find(f => f.id === mediaFileId && isPlayableFileName(f.name))
  if (!media) return null

  const srt = findSubtitleFile(files, media.name)
  return {
    id: folderId,
    name: baseName(media.name),
    mediaFileId: media.id,
    isAudio: /^audio\//i.test(media.mimeType ?? '') || /\.mp3$/i.test(media.name),
    subtitleFileName: subtitleFileName(media.name),
    subtitleFileId: srt?.id ?? null,
    cues: srt ? parseSrt(await readDriveTextFileAsync(srt.id)) : [],
  }
}

export interface DriveMedia {
  status: number
  headers: Record<string, string | undefined>
  stream: Readable
}

// Passes the browser's Range header on to Drive, so seeking only downloads the part that's needed.
export async function getDriveMediaAsync(fileId: string, range: string | null): Promise<DriveMedia> {
  const res = await getDriveClient().files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream', headers: range ? { Range: range } : {} },
  )
  return { status: res.status, headers: res.headers, stream: res.data as unknown as Readable }
}
