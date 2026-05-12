/**
 * JSON-file-backed store for the fraselijst feature.
 * Data is persisted to public/woordenlijst.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------
const DATA_FILE = join(process.cwd(), 'public', 'woordenlijst.json')

// ---------------------------------------------------------------------------
// Document shape stored in the JSON file
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

// ---------------------------------------------------------------------------
// Shape returned by the API
// ---------------------------------------------------------------------------
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
// Read / write helpers
// ---------------------------------------------------------------------------
function readAll(): FraselijstDoc[] {
  if (!existsSync(DATA_FILE)) return []
  const raw = readFileSync(DATA_FILE, 'utf-8')
  const parsed = JSON.parse(raw) as Record<string, unknown>[]
  // Migrate legacy entries (numeric id, no normalizedWord/dates)
  return parsed.map((entry) => ({
    id: String(entry.id ?? randomUUID()),
    word: String(entry.word ?? ''),
    normalizedWord: String(entry.normalizedWord ?? normalizeWord(String(entry.word ?? ''))),
    translation: String(entry.translation ?? ''),
    examples: Array.isArray(entry.examples) ? entry.examples.map(String) : [],
    createdAt: String(entry.createdAt ?? new Date().toISOString()),
    updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
  }))
}

function writeAll(docs: FraselijstDoc[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2) + '\n', 'utf-8')
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------
export async function getAllWords(): Promise<FraselijstDoc[]> {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function findById(id: string): Promise<FraselijstDoc | null> {
  return readAll().find((d) => d.id === id) ?? null
}

export async function findByNormalizedWord(
  nw: string,
  excludeId?: string
): Promise<FraselijstDoc | null> {
  return (
    readAll().find(
      (d) => d.normalizedWord === nw && d.id !== excludeId
    ) ?? null
  )
}

export async function insertWord(
  doc: Omit<FraselijstDoc, 'id'>
): Promise<FraselijstDoc> {
  const all = readAll()
  const newDoc: FraselijstDoc = { id: randomUUID(), ...doc }
  all.push(newDoc)
  writeAll(all)
  return newDoc
}

export async function updateWord(
  id: string,
  update: Partial<Omit<FraselijstDoc, 'id'>>
): Promise<FraselijstDoc | null> {
  const all = readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...update }
  writeAll(all)
  return all[idx]
}

export async function deleteWord(id: string): Promise<FraselijstDoc | null> {
  const all = readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  const [removed] = all.splice(idx, 1)
  writeAll(all)
  return removed
}

// ---------------------------------------------------------------------------
// initializeMongo — kept for backward compat (now a no-op)
// ---------------------------------------------------------------------------
export async function initializeMongo(): Promise<void> {
  // No-op: using local JSON file
}

// ---------------------------------------------------------------------------
// isValidId — accepts any non-empty string
// ---------------------------------------------------------------------------
export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}
