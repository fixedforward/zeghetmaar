import path from 'path'
import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { config } from './config'
import type { Phrase, WordEntry, Meaning, ListeningLink } from '../types'
import {
  isValidIsoDate,
  isoDateToYearDay,
  yearDayToIsoDate,
  encodeYearBitmap,
  decodeYearBitmap,
  propertyKeyForYear,
  yearFromPropertyKey,
  type PracticeLogType,
} from './practiceLog'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FILE_ID = config.database.googleJsonFile.googleDriveFileId

// Write the embedded service account to a unique tmp file to avoid conflicts with parallel instances.
const SA_TMP_PATH = path.join('/tmp', `google-sa-${randomUUID()}.json`)
writeFileSync(SA_TMP_PATH, JSON.stringify(config.database.googleJsonFile.serviceAccount), 'utf-8')

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SA_TMP_PATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// ---------------------------------------------------------------------------
// Document shape — imported from ../types
// ---------------------------------------------------------------------------
export type { Phrase as FraselijstDoc, WordEntry }

export function toApiEntry(doc: Phrase): WordEntry {
  return {
    id: doc.id,
    word: doc.word,
    meanings: doc.meanings,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(doc.tags !== undefined && doc.tags.length > 0 && { tags: doc.tags }),
    ...(doc.beheersing !== undefined && { beheersing: doc.beheersing }),
    ...(doc.lastPracticedAt !== undefined && { lastPracticedAt: doc.lastPracticedAt }),
    ...(doc.isFavorite !== undefined && { isFavorite: doc.isFavorite }),
  }
}

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of tags) {
    const trimmed = tag.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

// Validates/cleans a raw `meanings` payload from a request body: must be a
// non-empty array of { translation, examples }, each translation non-blank.
// Returns null if the shape is invalid so the caller can reject the request.
export function normalizeMeanings(raw: unknown): Meaning[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const result: Meaning[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { translation, examples } = item as { translation?: unknown; examples?: unknown }
    if (typeof translation !== 'string' || !translation.trim()) return null
    const rawExamples = Array.isArray(examples) ? examples : []
    const cleanExamples = [...new Set(
      rawExamples.filter((e): e is string => typeof e === 'string').map(e => e.trim()).filter(Boolean)
    )]
    result.push({ translation: translation.trim(), examples: cleanExamples })
  }
  return result
}

// ---------------------------------------------------------------------------
// Migrate legacy / partial entries
// ---------------------------------------------------------------------------

// Legacy docs had one top-level { translation, examples } pair; that becomes
// a single-item meanings array. Docs already shaped with `meanings` pass
// through (re-cleaned in case of partial/corrupt data).
function migrateMeanings(entry: Record<string, unknown>): Meaning[] {
  if (Array.isArray(entry.meanings) && entry.meanings.length > 0) {
    return entry.meanings.map((m) => {
      const meaning = (m ?? {}) as Record<string, unknown>
      return {
        translation: String(meaning.translation ?? ''),
        examples: Array.isArray(meaning.examples) ? meaning.examples.map(String) : [],
      }
    })
  }
  return [{
    translation: String(entry.translation ?? ''),
    examples: Array.isArray(entry.examples) ? entry.examples.map(String) : [],
  }]
}

function migrate(parsed: Record<string, unknown>[]): Phrase[] {
  return parsed.map((entry) => {
    const raw: Phrase = {
      id: String(entry.id ?? randomUUID()),
      word: String(entry.word ?? ''),
      normalizedWord: String(
        entry.normalizedWord ?? normalizeWord(String(entry.word ?? ''))
      ),
      meanings: migrateMeanings(entry),
      createdAt: String(entry.createdAt ?? new Date().toISOString()),
      updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
    }
    if (entry.beheersing === 1 || entry.beheersing === 2 || entry.beheersing === 3) {
      raw.beheersing = entry.beheersing
    }
    if (typeof entry.lastPracticedAt === 'string') {
      raw.lastPracticedAt = entry.lastPracticedAt
    }
    if (typeof entry.isFavorite === 'boolean') {
      raw.isFavorite = entry.isFavorite
    }
    if (Array.isArray(entry.tags)) {
      const tags = normalizeTags(entry.tags.map(String))
      if (tags.length > 0) raw.tags = tags
    }
    return raw
  })
}

// ---------------------------------------------------------------------------
// Drive read / write
// ---------------------------------------------------------------------------

// The file's root used to just be the phrases array. It's now
// { phrases, preparedQuizFileIds, readArticleIds, listeningLinks } so other, unrelated
// concerns (which quiz files / articles the user has ticked off, the Luisteren
// YouTube links) can live in the same
// file without a new Drive file (service accounts can't create one). A legacy
// array-shaped root is still read correctly (the id lists default to empty).
interface StoredRoot {
  phrases: Phrase[]
  preparedQuizFileIds: string[]
  readArticleIds: string[]
  listeningLinks: ListeningLink[]
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []
}

function toListeningLinks(value: unknown): ListeningLink[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is ListeningLink =>
    !!x && typeof x.id === 'string' && typeof x.url === 'string' &&
    typeof x.title === 'string' && typeof x.createdAt === 'string'
  )
}

async function driveReadRoot(): Promise<StoredRoot> {
  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId: FILE_ID, alt: 'media' },
    { responseType: 'text' }
  )
  const parsed = JSON.parse(res.data as string) as unknown

  if (Array.isArray(parsed)) {
    return { phrases: migrate(parsed as Record<string, unknown>[]), preparedQuizFileIds: [], readArticleIds: [], listeningLinks: [] }
  }

  const obj = (parsed ?? {}) as Record<string, unknown>
  const phrases = Array.isArray(obj.phrases) ? (obj.phrases as Record<string, unknown>[]) : []
  return {
    phrases: migrate(phrases),
    preparedQuizFileIds: toStringArray(obj.preparedQuizFileIds),
    readArticleIds: toStringArray(obj.readArticleIds),
    listeningLinks: toListeningLinks(obj.listeningLinks),
  }
}

async function driveWriteRoot(root: StoredRoot): Promise<void> {
  const drive = getDriveClient()
  const body = JSON.stringify(
    {
      phrases: root.phrases,
      preparedQuizFileIds: root.preparedQuizFileIds,
      readArticleIds: root.readArticleIds,
      listeningLinks: root.listeningLinks,
    },
    null,
    2
  ) + '\n'
  await drive.files.update({
    fileId: FILE_ID,
    media: { mimeType: 'application/json', body: Readable.from([body]) },
  })
}

// ---------------------------------------------------------------------------
// Unified read / write — phrase-only callers use these; callers that also
// need to preserve the marked-file id lists across a write use driveReadRoot /
// driveWriteRoot directly instead (see the CRUD functions below).
// ---------------------------------------------------------------------------
async function readAll(): Promise<Phrase[]> {
  return (await driveReadRoot()).phrases
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function getAllWords(): Promise<Phrase[]> {
  const all = await readAll()
  return all.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function findById(id: string): Promise<Phrase | null> {
  return (await readAll()).find((d) => d.id === id) ?? null
}

export async function findByNormalizedWord(
  nw: string,
  excludeId?: string
): Promise<Phrase | null> {
  return (await readAll()).find(
    (d) => d.normalizedWord === nw && d.id !== excludeId
  ) ?? null
}

export async function insertWord(
  doc: Omit<Phrase, 'id'>
): Promise<Phrase> {
  const root = await driveReadRoot()
  const newDoc: Phrase = { id: randomUUID(), ...doc }
  root.phrases.push(newDoc)
  await driveWriteRoot(root)
  return newDoc
}

export async function updateWord(
  id: string,
  update: Partial<Omit<Phrase, 'id'>>
): Promise<Phrase | null> {
  const root = await driveReadRoot()
  const idx = root.phrases.findIndex((d) => d.id === id)
  if (idx === -1) return null
  root.phrases[idx] = { ...root.phrases[idx], ...update }
  await driveWriteRoot(root)
  return root.phrases[idx]
}

export async function deleteWord(id: string): Promise<Phrase | null> {
  const root = await driveReadRoot()
  const idx = root.phrases.findIndex((d) => d.id === id)
  if (idx === -1) return null
  const [removed] = root.phrases.splice(idx, 1)
  await driveWriteRoot(root)
  return removed
}

export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}

// ---------------------------------------------------------------------------
// Tag management — bulk operations across all phrases
// ---------------------------------------------------------------------------
export async function renameTag(oldTag: string, newTag: string): Promise<number> {
  const root = await driveReadRoot()
  const trimmedNew = newTag.trim()
  const oldKey = oldTag.trim().toLowerCase()
  const now = new Date().toISOString()
  let count = 0

  const updated = root.phrases.map((doc) => {
    if (!doc.tags?.some((t) => t.toLowerCase() === oldKey)) return doc
    count++
    const withoutOld = doc.tags.filter((t) => t.toLowerCase() !== oldKey)
    return { ...doc, tags: normalizeTags([...withoutOld, trimmedNew]), updatedAt: now }
  })

  if (count > 0) await driveWriteRoot({ ...root, phrases: updated })
  return count
}

// ---------------------------------------------------------------------------
// Practice log — which days the user practiced, per practice type
// (Oefensessie, Quiz — each tracked independently), stored as one
// appProperties entry per year on the phrase-list file itself (a compact
// day-of-year bitmap), since a service account has no storage quota to
// create a separate file for this.
// ---------------------------------------------------------------------------
export async function getPracticedDatesAsync(logType: PracticeLogType): Promise<string[]> {
  const drive = getDriveClient()
  const res = await drive.files.get({ fileId: FILE_ID, fields: 'appProperties' })
  const props = res.data.appProperties ?? {}

  const dates: string[] = []
  for (const [key, value] of Object.entries(props)) {
    const year = yearFromPropertyKey(logType, key)
    if (year === null || !value) continue
    for (const day of decodeYearBitmap(value)) dates.push(yearDayToIsoDate(year, day))
  }
  return dates.sort()
}

export async function markPracticedDateAsync(logType: PracticeLogType, date: string): Promise<string[]> {
  if (!isValidIsoDate(date)) throw new Error('date must be in YYYY-MM-DD format.')

  const { year, day } = isoDateToYearDay(date)
  const key = propertyKeyForYear(logType, year)

  const drive = getDriveClient()
  const res = await drive.files.get({ fileId: FILE_ID, fields: 'appProperties' })
  const existing = res.data.appProperties?.[key]
  const days = existing ? decodeYearBitmap(existing) : new Set<number>()

  if (!days.has(day)) {
    days.add(day)
    await drive.files.update({
      fileId: FILE_ID,
      requestBody: { appProperties: { [key]: encodeYearBitmap(days) } },
    })
  }

  return getPracticedDatesAsync(logType)
}

export async function unmarkPracticedDateAsync(logType: PracticeLogType, date: string): Promise<string[]> {
  if (!isValidIsoDate(date)) throw new Error('date must be in YYYY-MM-DD format.')

  const { year, day } = isoDateToYearDay(date)
  const key = propertyKeyForYear(logType, year)

  const drive = getDriveClient()
  const res = await drive.files.get({ fileId: FILE_ID, fields: 'appProperties' })
  const existing = res.data.appProperties?.[key]

  if (existing) {
    const days = decodeYearBitmap(existing)
    if (days.has(day)) {
      days.delete(day)
      await drive.files.update({
        fileId: FILE_ID,
        requestBody: { appProperties: { [key]: encodeYearBitmap(days) } },
      })
    }
  }

  return getPracticedDatesAsync(logType)
}

export async function deleteTag(tag: string): Promise<number> {
  const root = await driveReadRoot()
  const key = tag.trim().toLowerCase()
  const now = new Date().toISOString()
  let count = 0

  const updated = root.phrases.map((doc) => {
    if (!doc.tags?.some((t) => t.toLowerCase() === key)) return doc
    count++
    const tags = doc.tags.filter((t) => t.toLowerCase() !== key)
    return { ...doc, tags: tags.length > 0 ? tags : undefined, updatedAt: now }
  })

  if (count > 0) await driveWriteRoot({ ...root, phrases: updated })
  return count
}

// ---------------------------------------------------------------------------
// Marked files — which Drive quiz files the user has marked as prepared, and
// which articles they've marked as read. Plain arrays on the same file's root
// (see StoredRoot) rather than an appProperties bitmap, since these are
// arbitrary Drive file IDs, not dates — there's no fixed-size encoding for an
// open-ended set of ids.
// ---------------------------------------------------------------------------
const MARKED_FILE_FIELDS = {
  quiz: 'preparedQuizFileIds',
  articles: 'readArticleIds',
} as const satisfies Record<string, keyof StoredRoot>

export type MarkedFileKind = keyof typeof MARKED_FILE_FIELDS

export function isMarkedFileKind(value: string): value is MarkedFileKind {
  return Object.hasOwn(MARKED_FILE_FIELDS, value)
}

export async function getMarkedFileIdsAsync(kind: MarkedFileKind): Promise<string[]> {
  return (await driveReadRoot())[MARKED_FILE_FIELDS[kind]]
}

export async function setFileMarkedAsync(kind: MarkedFileKind, fileId: string, marked: boolean): Promise<string[]> {
  const root = await driveReadRoot()
  const field = MARKED_FILE_FIELDS[kind]
  const set = new Set(root[field])
  if (marked) {
    set.add(fileId)
  } else {
    set.delete(fileId)
  }
  const fileIds = [...set]
  await driveWriteRoot({ ...root, [field]: fileIds })
  return fileIds
}

// ---------------------------------------------------------------------------
// Luisteren links — YouTube links stored on the same root (see StoredRoot),
// newest first.
// ---------------------------------------------------------------------------
export async function getListeningLinksAsync(): Promise<ListeningLink[]> {
  return (await driveReadRoot()).listeningLinks
}

export async function addListeningLinkAsync(title: string, url: string): Promise<ListeningLink[]> {
  const root = await driveReadRoot()
  const link: ListeningLink = { id: randomUUID(), title, url, createdAt: new Date().toISOString() }
  const listeningLinks = [link, ...root.listeningLinks]
  await driveWriteRoot({ ...root, listeningLinks })
  return listeningLinks
}

export async function deleteListeningLinkAsync(id: string): Promise<ListeningLink[]> {
  const root = await driveReadRoot()
  const listeningLinks = root.listeningLinks.filter(l => l.id !== id)
  if (listeningLinks.length !== root.listeningLinks.length) await driveWriteRoot({ ...root, listeningLinks })
  return listeningLinks
}
