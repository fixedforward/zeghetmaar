/**
 * MongoDB helper for the fraselijst feature.
 * NOTE: public/woordenlijst.json is a legacy remnant — it is no longer the
 * source of truth. The collection `zeghetmaar.fraselijst` is the only store.
 */
import { MongoClient, Collection, ObjectId, WithId } from 'mongodb'
import configFile from '../config.json'

// ---------------------------------------------------------------------------
// Config resolution: MONGODB_URI env var → app/config.json mongodbUri
// ---------------------------------------------------------------------------
const mongodbUri: string =
  process.env.MONGODB_URI ||
  (configFile as { mongodbUri?: string }).mongodbUri ||
  ''

if (!mongodbUri) {
  throw new Error(
    'MongoDB URI is not configured. Set MONGODB_URI env var or mongodbUri in app/config.json.'
  )
}

// ---------------------------------------------------------------------------
// Document shape stored in MongoDB
// ---------------------------------------------------------------------------
export interface FraselijstDoc {
  word: string
  normalizedWord: string
  translation: string
  examples: string[]
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Shape returned by the API (no _id / normalizedWord exposed)
// ---------------------------------------------------------------------------
export interface WordEntry {
  id: string
  word: string
  translation: string
  examples: string[]
}

export function toApiEntry(doc: WithId<FraselijstDoc>): WordEntry {
  return {
    id: doc._id.toHexString(),
    word: doc.word,
    translation: doc.translation,
    examples: doc.examples,
  }
}

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | null
}

let clientPromise: Promise<MongoClient>

if (!global._mongoClient) {
  const client = new MongoClient(mongodbUri)
  global._mongoClient = client
  clientPromise = client.connect()
} else {
  clientPromise = Promise.resolve(global._mongoClient)
}

// ---------------------------------------------------------------------------
// initializeMongo — call once at startup to validate connection + ensure index
// ---------------------------------------------------------------------------
export async function initializeMongo(): Promise<void> {
  const client = await clientPromise
  // Ping to validate connectivity
  await client.db('zeghetmaar').command({ ping: 1 })
  // Ensure unique index on normalizedWord
  const col = client.db('zeghetmaar').collection<FraselijstDoc>('fraselijst')
  await col.createIndex({ normalizedWord: 1 }, { unique: true })
}

// ---------------------------------------------------------------------------
// getCollection — returns the typed collection handle
// ---------------------------------------------------------------------------
export async function getCollection(): Promise<Collection<FraselijstDoc>> {
  const client = await clientPromise
  return client.db('zeghetmaar').collection<FraselijstDoc>('fraselijst')
}

// ---------------------------------------------------------------------------
// isValidObjectId — guard for route handlers
// ---------------------------------------------------------------------------
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toHexString() === id
}
