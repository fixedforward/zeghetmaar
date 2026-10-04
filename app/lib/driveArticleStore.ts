import { getDriveClient } from './driveStore'
import { readDriveTextFileAsync } from './driveQuizStore'
import { config } from './config'
import type { Article, ArticleFolder, ArticleItem } from '../types'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'

export function getArticlesRootFolderId(): string | undefined {
  return config.database.googleArticlesFolder?.folderId || undefined
}

export function parseArticleText(text: string): string[] {
  return text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

type DriveFile = { id?: string | null; name?: string | null; mimeType?: string | null; createdTime?: string | null }

export function toArticleItems(files: DriveFile[]): ArticleItem[] {
  const folders: ArticleItem[] = []
  const articles: (ArticleItem & { createdMs: number })[] = []
  for (const f of files) {
    if (!f.id || !f.name) continue
    if (f.mimeType === FOLDER_MIME) folders.push({ id: f.id, name: f.name, kind: 'folder' })
    else if (f.mimeType === GOOGLE_DOC_MIME || f.name.toLowerCase().endsWith('.txt'))
      articles.push({ id: f.id, name: f.name, kind: 'article', createdMs: f.createdTime ? new Date(f.createdTime).getTime() : 0 })
  }
  folders.sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  articles.sort((a, b) => b.createdMs - a.createdMs || a.name.localeCompare(b.name, 'nl'))
  return [...folders, ...articles.map(({ createdMs: _, ...item }) => item)]
}

export async function listArticleFolderAsync(folderId: string): Promise<ArticleFolder> {
  const drive = getDriveClient()
  const [res, folderRes] = await Promise.all([
    drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, createdTime)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    }),
    drive.files.get({ fileId: folderId, fields: 'name', supportsAllDrives: true }).catch(() => null),
  ])

  return { id: folderId, name: folderRes?.data.name ?? '', items: toArticleItems(res.data.files ?? []) }
}

export async function getArticleAsync(fileId: string): Promise<Article> {
  const drive = getDriveClient()
  const [meta, text] = await Promise.all([
    drive.files.get({ fileId, fields: 'name', supportsAllDrives: true }),
    readDriveTextFileAsync(fileId),
  ])
  return { id: fileId, name: meta.data.name ?? '', paragraphs: parseArticleText(text) }
}
