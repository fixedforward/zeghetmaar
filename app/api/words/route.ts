import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import {
  getCollection,
  toApiEntry,
  normalizeWord,
  isValidObjectId,
} from '@/app/lib/mongodb'

export async function GET() {
  try {
    const col = await getCollection()
    const docs = await col.find({}).sort({ updatedAt: -1 }).toArray()
    return NextResponse.json(docs.map(toApiEntry))
  } catch (err) {
    console.error('[/api/words] Failed to read words:', err)
    return NextResponse.json({ error: 'Failed to read word list.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { word?: unknown; translation?: unknown; examples?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.word !== 'string' || typeof body.translation !== 'string') {
    return NextResponse.json({ error: 'word and translation are required strings.' }, { status: 400 })
  }

  const word = body.word.trim()
  const translation = body.translation.trim()

  if (!word || !translation) {
    return NextResponse.json({ error: 'word and translation must not be empty.' }, { status: 400 })
  }

  const rawExamples = Array.isArray(body.examples) ? body.examples : []
  const examples: string[] = [...new Set(
    rawExamples
      .filter((e): e is string => typeof e === 'string')
      .map(e => e.trim())
      .filter(Boolean)
  )]

  const normalizedWord = normalizeWord(word)
  const now = new Date()

  try {
    const col = await getCollection()
    const result = await col.insertOne({
      word,
      normalizedWord,
      translation,
      examples,
      createdAt: now,
      updatedAt: now,
    })
    const inserted = await col.findOne({ _id: result.insertedId })
    return NextResponse.json(toApiEntry(inserted!), { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'A word with this name already exists.' }, { status: 409 })
    }
    console.error('[/api/words] Failed to add word:', err)
    return NextResponse.json({ error: 'Failed to add word.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  let body: { id?: unknown; word?: unknown; translation?: unknown; examples?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.id !== 'string' || !isValidObjectId(body.id)) {
    return NextResponse.json({ error: 'id must be a valid ObjectId string.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (body.word !== undefined) {
    if (typeof body.word !== 'string' || !body.word.trim()) {
      return NextResponse.json({ error: 'word must be a non-empty string.' }, { status: 400 })
    }
    update.word = body.word.trim()
    update.normalizedWord = normalizeWord(body.word)
  }

  if (body.translation !== undefined) {
    if (typeof body.translation !== 'string' || !body.translation.trim()) {
      return NextResponse.json({ error: 'translation must be a non-empty string.' }, { status: 400 })
    }
    update.translation = body.translation.trim()
  }

  if (body.examples !== undefined) {
    if (!Array.isArray(body.examples)) {
      return NextResponse.json({ error: 'examples must be an array.' }, { status: 400 })
    }
    update.examples = [...new Set(
      (body.examples as unknown[])
        .filter((e): e is string => typeof e === 'string')
        .map(e => e.trim())
        .filter(Boolean)
    )]
  }

  try {
    const col = await getCollection()
    const oid = new ObjectId(body.id)

    // Duplicate check: if updating word, ensure no other doc has same normalizedWord
    if (update.normalizedWord) {
      const conflict = await col.findOne({
        normalizedWord: update.normalizedWord,
        _id: { $ne: oid },
      })
      if (conflict) {
        return NextResponse.json({ error: 'A word with this name already exists.' }, { status: 409 })
      }
    }

    const updated = await col.findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!updated) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 })
    }
    return NextResponse.json(toApiEntry(updated))
  } catch (err) {
    console.error('[/api/words] Failed to update word:', err)
    return NextResponse.json({ error: 'Failed to update word.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  let body: { id?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.id !== 'string' || !isValidObjectId(body.id)) {
    return NextResponse.json({ error: 'id must be a valid ObjectId string.' }, { status: 400 })
  }

  try {
    const col = await getCollection()
    const deleted = await col.findOneAndDelete({ _id: new ObjectId(body.id) })
    if (!deleted) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/words] Failed to delete word:', err)
    return NextResponse.json({ error: 'Failed to delete word.' }, { status: 500 })
  }
}
