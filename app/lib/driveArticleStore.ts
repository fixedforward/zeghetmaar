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

export function toArticleItems(files: { id?: string | null; name?: string | null; mimeType?: string | null }[]): ArticleItem[] {
  const items: ArticleItem[] = []
  for (const f of files) {
    if (!f.id || !f.name) continue
    if (f.mimeType === FOLDER_MIME) items.push({ id: f.id, name: f.name, kind: 'folder' })
    else if (f.mimeType === GOOGLE_DOC_MIME || f.name.toLowerCase().endsWith('.txt')) items.push({ id: f.id, name: f.name, kind: 'article' })
  }
  return items.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name, 'nl') : a.kind === 'folder' ? -1 : 1
  )
}

export async function listArticleFolderAsync(folderId: string): Promise<ArticleFolder> {
  const drive = getDriveClient()
  const [res, folderRes] = await Promise.all([
    drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
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
