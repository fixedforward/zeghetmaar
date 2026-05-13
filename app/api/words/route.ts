import { NextRequest, NextResponse } from 'next/server'
import {
  getAllWords,
  findByNormalizedWord,
  insertWord,
  updateWord,
  deleteWord,
  findById,
  toApiEntry,
  normalizeWord,
  isValidObjectId,
} from '@/app/lib/driveStore'

export async function GET() {
  try {
    const docs = await getAllWords()
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

  const nw = normalizeWord(word)
  const now = new Date().toISOString()

  try {
    const conflict = await findByNormalizedWord(nw)
    if (conflict) {
      return NextResponse.json({ error: 'A word with this name already exists.' }, { status: 409 })
    }

    const inserted = await insertWord({
      word,
      normalizedWord: nw,
      translation,
      examples,
      createdAt: now,
      updatedAt: now,
    })
    return NextResponse.json(toApiEntry(inserted), { status: 201 })
  } catch (err) {
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
    return NextResponse.json({ error: 'id must be a valid string.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

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
    // Duplicate check: if updating word, ensure no other doc has same normalizedWord
    if (update.normalizedWord) {
      const conflict = await findByNormalizedWord(
        update.normalizedWord as string,
        body.id as string
      )
      if (conflict) {
        return NextResponse.json({ error: 'A word with this name already exists.' }, { status: 409 })
      }
    }

    const updated = await updateWord(body.id as string, update)
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
    return NextResponse.json({ error: 'id must be a valid string.' }, { status: 400 })
  }

  try {
    const deleted = await deleteWord(body.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/words] Failed to delete word:', err)
    return NextResponse.json({ error: 'Failed to delete word.' }, { status: 500 })
  }
}
