import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getAllWords,
  findByNormalizedWord,
  insertWord,
  updateWord,
  deleteWord,
  findById,
  toApiEntry,
  normalizeWord,
  normalizeTags,
  normalizeMeanings,
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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  let body: { word?: unknown; meanings?: unknown; tags?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.word !== 'string') {
    return NextResponse.json({ error: 'word is required.' }, { status: 400 })
  }

  const word = body.word.trim()

  if (!word) {
    return NextResponse.json({ error: 'word must not be empty.' }, { status: 400 })
  }

  const meanings = normalizeMeanings(body.meanings)
  if (!meanings) {
    return NextResponse.json({ error: 'meanings must be a non-empty array of { translation, examples }.' }, { status: 400 })
  }

  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    return NextResponse.json({ error: 'tags must be an array.' }, { status: 400 })
  }
  const tags = normalizeTags(
    (Array.isArray(body.tags) ? body.tags : []).filter((t): t is string => typeof t === 'string')
  )

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
      meanings,
      ...(tags.length > 0 && { tags }),
      beheersing: 1,
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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  let body: { id?: unknown; word?: unknown; meanings?: unknown; tags?: unknown; beheersing?: unknown; lastPracticedAt?: unknown; isFavorite?: unknown }
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

  if (body.meanings !== undefined) {
    const meanings = normalizeMeanings(body.meanings)
    if (!meanings) {
      return NextResponse.json({ error: 'meanings must be a non-empty array of { translation, examples }.' }, { status: 400 })
    }
    update.meanings = meanings
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: 'tags must be an array.' }, { status: 400 })
    }
    update.tags = normalizeTags(
      (body.tags as unknown[]).filter((t): t is string => typeof t === 'string')
    )
  }

  if (body.beheersing !== undefined) {
    if (body.beheersing !== 1 && body.beheersing !== 2 && body.beheersing !== 3) {
      return NextResponse.json({ error: 'beheersing must be 1, 2, or 3.' }, { status: 400 })
    }
    update.beheersing = body.beheersing
  }

  if (body.lastPracticedAt !== undefined) {
    if (typeof body.lastPracticedAt !== 'string') {
      return NextResponse.json({ error: 'lastPracticedAt must be a string.' }, { status: 400 })
    }
    update.lastPracticedAt = body.lastPracticedAt
  }

  if (body.isFavorite !== undefined) {
    if (typeof body.isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'isFavorite must be a boolean.' }, { status: 400 })
    }
    update.isFavorite = body.isFavorite
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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

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
