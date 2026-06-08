import path from 'path'
import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { config } from './config'
import type { Phrase, WordEntry } from '../types'

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
function getDriveClient() {
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
    translation: doc.translation,
    examples: doc.examples,
    updatedAt: doc.updatedAt,
    ...(doc.beheersing !== undefined && { beheersing: doc.beheersing }),
    ...(doc.lastPracticedAt !== undefined && { lastPracticedAt: doc.lastPracticedAt }),
    ...(doc.isFavorite !== undefined && { isFavorite: doc.isFavorite }),
  }
}

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Migrate legacy / partial entries
// ---------------------------------------------------------------------------
function migrate(parsed: Record<string, unknown>[]): Phrase[] {
  return parsed.map((entry) => {
    const raw: Phrase = {
      id: String(entry.id ?? randomUUID()),
      word: String(entry.word ?? ''),
      normalizedWord: String(
        entry.normalizedWord ?? normalizeWord(String(entry.word ?? ''))
      ),
      translation: String(entry.translation ?? ''),
      examples: Array.isArray(entry.examples) ? entry.examples.map(String) : [],
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
    return raw
  })
}

// ---------------------------------------------------------------------------
// Drive read / write
// ---------------------------------------------------------------------------
async function driveReadAll(): Promise<Phrase[]> {
  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId: FILE_ID, alt: 'media' },
    { responseType: 'text' }
  )
  return migrate(JSON.parse(res.data as string) as Record<string, unknown>[])
}

async function driveWriteAll(docs: Phrase[]): Promise<void> {
  const drive = getDriveClient()
  const body = JSON.stringify(docs, null, 2) + '\n'
  await drive.files.update({
    fileId: FILE_ID,
    media: { mimeType: 'application/json', body: Readable.from([body]) },
  })
}

// ---------------------------------------------------------------------------
// Unified read / write
// ---------------------------------------------------------------------------
async function readAll(): Promise<Phrase[]> {
  return driveReadAll()
}

async function writeAll(docs: Phrase[]): Promise<void> {
  await driveWriteAll(docs)
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
  const all = await readAll()
  const newDoc: Phrase = { id: randomUUID(), ...doc }
  all.push(newDoc)
  await writeAll(all)
  return newDoc
}

export async function updateWord(
  id: string,
  update: Partial<Omit<Phrase, 'id'>>
): Promise<Phrase | null> {
  const all = await readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...update }
  await writeAll(all)
  return all[idx]
}

export async function deleteWord(id: string): Promise<Phrase | null> {
  const all = await readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  const [removed] = all.splice(idx, 1)
  await writeAll(all)
  return removed
}

export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}
