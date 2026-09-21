import { getDriveClient } from './driveStore'
import { config } from './config'
import type { QuizFile, QuizPair } from '../types'

export type { QuizFile, QuizPair }

export function isQuizConfigured(): boolean {
  return !!config.database.googleQuizFolder?.folderId
}

const NUMBERED_LINE = /^(\d+)[.)]\s*(.*)$/

export function parseQuizFile(text: string): QuizPair[] {
  const entries: { num: number; text: string }[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const match = line.match(NUMBERED_LINE)
    if (!match) continue

    let sentence = match[2].trim()
    if (sentence.endsWith('\\')) sentence = sentence.slice(0, -1).trim()
    if (sentence) entries.push({ num: Number(match[1]), text: sentence })
  }

  let splitIndex = entries.length
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].num <= entries[i - 1].num) {
      splitIndex = i
      break
    }
  }

  const dutch = entries.slice(0, splitIndex)
  const english = entries.slice(splitIndex)

  if (dutch.length === 0 || dutch.length !== english.length) {
    throw new Error(
      'Quiz file must contain two matching numbered lists (e.g. Dutch sentences 1-N, then English sentences 1-N).'
    )
  }

  return dutch.map((entry, i) => ({ dutch: entry.text, english: english[i].text }))
}

export const QUIZ_FILES_PAGE_SIZE = 10

export interface QuizFilesPage {
  files: QuizFile[]
  nextPageToken?: string
  folderName?: string
}

export async function listQuizFilesAsync(pageToken?: string, pageSize = QUIZ_FILES_PAGE_SIZE): Promise<QuizFilesPage> {
  const folderId = config.database.googleQuizFolder?.folderId
  if (!folderId) throw new Error('Quiz folder is not configured.')

  const drive = getDriveClient()
  const [res, folderRes] = await Promise.all([
    drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name), nextPageToken',
      orderBy: 'name desc',
      pageSize,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    }),
    drive.files.get({ fileId: folderId, fields: 'name', supportsAllDrives: true }).catch(() => null),
  ])

  const files = (res.data.files ?? [])
    .filter((f): f is { id: string; name: string } => !!f.id && !!f.name)
    .filter((f) => f.name.toLowerCase().endsWith('.txt'))
    .map((f) => ({ id: f.id, name: f.name }))

  return { files, nextPageToken: res.data.nextPageToken ?? undefined, folderName: folderRes?.data.name ?? undefined }
}

const GOOGLE_NATIVE_MIME_PREFIX = 'application/vnd.google-apps.'

export async function getQuizPairsAsync(fileId: string): Promise<QuizPair[]> {
  const drive = getDriveClient()

  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType',
    supportsAllDrives: true,
  })
  const mimeType = meta.data.mimeType ?? ''

  const res = mimeType.startsWith(GOOGLE_NATIVE_MIME_PREFIX)
    ? await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' })
    : await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'text' })

  return parseQuizFile(res.data as string)
}
