import path from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------
const SONGS_DIR = path.join(process.cwd(), 'public', 'songs')
const SONGS_FILE = path.join(SONGS_DIR, 'songs.json')

// ---------------------------------------------------------------------------
// Document shape
// ---------------------------------------------------------------------------
export interface SongDoc {
  id: string
  title: string
  artist: string
  youtubeUrl: string
  lyrics: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Migrate / validate raw entries
// ---------------------------------------------------------------------------
function migrate(parsed: Record<string, unknown>[]): SongDoc[] {
  return parsed.map((entry) => ({
    id: String(entry.id ?? randomUUID()),
    title: String(entry.title ?? ''),
    artist: String(entry.artist ?? ''),
    youtubeUrl: String(entry.youtubeUrl ?? ''),
    lyrics: String(entry.lyrics ?? ''),
    createdAt: String(entry.createdAt ?? new Date().toISOString()),
    updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
  }))
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------
function readAll(): SongDoc[] {
  if (!existsSync(SONGS_FILE)) return []
  try {
    const raw = readFileSync(SONGS_FILE, 'utf-8')
    return migrate(JSON.parse(raw) as Record<string, unknown>[])
  } catch {
    return []
  }
}

function writeAll(docs: SongDoc[]): void {
  if (!existsSync(SONGS_DIR)) {
    mkdirSync(SONGS_DIR, { recursive: true })
  }
  writeFileSync(SONGS_FILE, JSON.stringify(docs, null, 2) + '\n', 'utf-8')
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export function getAllSongs(): SongDoc[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function insertSong(doc: Omit<SongDoc, 'id'>): SongDoc {
  const all = readAll()
  const newDoc: SongDoc = { id: randomUUID(), ...doc }
  all.push(newDoc)
  writeAll(all)
  return newDoc
}

export function updateSong(
  id: string,
  update: Partial<Omit<SongDoc, 'id'>>
): SongDoc | null {
  const all = readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...update }
  writeAll(all)
  return all[idx]
}

export function deleteSong(id: string): SongDoc | null {
  const all = readAll()
  const idx = all.findIndex((d) => d.id === id)
  if (idx === -1) return null
  const [removed] = all.splice(idx, 1)
  writeAll(all)
  return removed
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}
