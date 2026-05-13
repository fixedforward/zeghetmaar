/**
 * Google Drive-backed store for the fraselijst feature.
 *
 * Uses service account credentials via googleapis GoogleAuth + keyFile,
 * as described in https://github.com/googleapis/google-api-nodejs-client#service-account-credentials
 *
 * Setup:
 *  1. Create a service account in Google Cloud Console → download JSON key file.
 *  2. Share your Drive JSON file with the service account email (Editor access).
 *  3. Set GOOGLE_APPLICATION_CREDENTIALS to the path of the key file,
 *     OR set googleKeyFile in app/config.json.
 *  4. Set GOOGLE_DRIVE_FILE_ID (or googleDriveFileId in app/config.json) to the Drive file ID.
 *
 * Falls back to public/woordenlijst.json when Drive credentials are not set.
 */
import path from 'path'
import process from 'process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { google } from 'googleapis'
import { Readable } from 'stream'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
let configFile: Record<string, string> = {}
try {
  configFile = JSON.parse(
    readFileSync(path.join(process.cwd(), 'app', 'config.json'), 'utf-8')
  ) as Record<string, string>
} catch {
  // config.json is optional
}

const KEY_FILE =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? configFile.googleKeyFile ?? ''

const FILE_ID =
  process.env.GOOGLE_DRIVE_FILE_ID ?? configFile.googleDriveFileId ?? ''

const USE_DRIVE = Boolean(KEY_FILE && FILE_ID)

const LOCAL_FILE = path.join(process.cwd(), 'public', 'woordenlijst.json')

// ---------------------------------------------------------------------------
// Auth — GoogleAuth with service account keyFile (from the README)
// ---------------------------------------------------------------------------
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// ---------------------------------------------------------------------------
// Document shape
// ---------------------------------------------------------------------------
export interface FraselijstDoc {
  id: string
  word: string
  normalizedWord: string
  translation: string
  examples: string[]
  createdAt: string
  updatedAt: string
}

export interface WordEntry {
  id: string
  word: string
  translation: string
  examples: string[]
}

export function toApiEntry(doc: FraselijstDoc): WordEntry {
  return {
    id: doc.id,
    word: doc.word,
    translation: doc.translation,
    examples: doc.examples,
  }
}

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Migrate legacy / partial entries
// ---------------------------------------------------------------------------
function migrate(parsed: Record<string, unknown>[]): FraselijstDoc[] {
  return parsed.map((entry) => ({
    id: String(entry.id ?? randomUUID()),
    word: String(entry.word ?? ''),
    normalizedWord: String(
      entry.normalizedWord ?? normalizeWord(String(entry.word ?? ''))
    ),
    translation: String(entry.translation ?? ''),
    examples: Array.isArray(entry.examples) ? entry.examples.map(String) : [],
    createdAt: String(entry.createdAt ?? new Date().toISOString()),
    updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
  }))
}

// ---------------------------------------------------------------------------
// Drive read / write
// ---------------------------------------------------------------------------
async function driveReadAll(): Promise<FraselijstDoc[]> {
  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId: FILE_ID, alt: 'media' },
    { responseType: 'text' }
  )
  return migrate(JSON.parse(res.data as string) as Record<string, unknown>[])
}

async function driveWriteAll(docs: FraselijstDoc[]): Promise<void> {
  const drive = getDriveClient()
  const body = JSON.stringify(docs, null, 2) + '\n'
  await drive.files.update({
    fileId: FILE_ID,
    media: { mimeType: 'application/json', body: Readable.from([body]) },
  })
}

// ---------------------------------------------------------------------------
// Local read / write (fallback)
// ---------------------------------------------------------------------------
function localReadAll(): FraselijstDoc[] {
  if (!existsSync(LOCAL_FILE)) return []
  const raw = readFileSync(LOCAL_FILE, 'utf-8')
  return migrate(JSON.parse(raw) as Record<string, unknown>[])
}

function localWriteAll(docs: FraselijstDoc[]): void {
  writeFileSync(LOCAL_FILE, JSON.stringify(docs, null, 2) + '\n', 'utf-8')
}

// ---------------------------------------------------------------------------
// Unified read / write
// ---------------------------------------------------------------------------
async function readAll(): Promise<FraselijstDoc[]> {
  return USE_DRIVE ? driveReadAll() : localReadAll()
}

async function writeAll(docs: FraselijstDoc[]): Promise<void> {
  if (USE_DRIVE) await driveWriteAll(docs)
  else localWriteAll(docs)
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export async function getAllWords(): Promise<FraselijstDoc[]> {
  const all = await readAll()
  return all.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function findById(id: string): Promise<FraselijstDoc | null> {
  return (await readAll()).find((d) => d.id === id) ?? null
}

export async function findByNormalizedWord(
  nw: string,
  excludeId?: string
): Promise<FraselijstDoc | null> {
  return (await readAll()).find(
    (d) => d.normalizedWord === nw && d.id !== excludeId
  ) ?? null
}

export async function insertWord(
  doc: Omit<FraselijstDoc, 'id'>
): Promise<FraselijstDoc> {
  const all = await readAll()
  const newDoc: FraselijstDoc = { id: randomUUID(), ...doc }
  all.push(newDoc)
  await writeAll(all)
  return newDoc
}

export async function updateWord(
  id: string,
  update: Partial<Omit<FraselijstDoc, 'id'>>
): Promise<FraselijstDoc | null> {
  const all = await readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...update }
  await writeAll(all)
  return all[idx]
}

export async function deleteWord(id: string): Promise<FraselijstDoc | null> {
  const all = await readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  const [removed] = all.splice(idx, 1)
  await writeAll(all)
  return removed
}

// ---------------------------------------------------------------------------
// initializeMongo — kept for backward compat (no-op)
// ---------------------------------------------------------------------------
export async function initializeMongo(): Promise<void> {
  // no-op
}

export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}
