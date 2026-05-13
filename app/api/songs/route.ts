import { NextRequest, NextResponse } from 'next/server'
import { getAllSongs, insertSong, updateSong, deleteSong, isValidId } from '@/app/lib/songsStore'

export async function GET() {
  try {
    return NextResponse.json(getAllSongs())
  } catch (err) {
    console.error('[/api/songs] Failed to read songs:', err)
    return NextResponse.json({ error: 'Failed to read song list.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { title?: unknown; artist?: unknown; youtubeUrl?: unknown; lyrics?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 })
  }
  if (typeof body.youtubeUrl !== 'string' || !body.youtubeUrl.trim()) {
    return NextResponse.json({ error: 'youtubeUrl is required.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  try {
    const inserted = insertSong({
      title: body.title.trim(),
      artist: typeof body.artist === 'string' ? body.artist.trim() : '',
      youtubeUrl: body.youtubeUrl.trim(),
      lyrics: typeof body.lyrics === 'string' ? body.lyrics : '',
      createdAt: now,
      updatedAt: now,
    })
    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error('[/api/songs] Failed to add song:', err)
    return NextResponse.json({ error: 'Failed to add song.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  let body: { id?: unknown; title?: unknown; artist?: unknown; youtubeUrl?: unknown; lyrics?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.id !== 'string' || !isValidId(body.id)) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title must be a non-empty string.' }, { status: 400 })
    }
    update.title = body.title.trim()
  }
  if (body.artist !== undefined) {
    update.artist = typeof body.artist === 'string' ? body.artist.trim() : ''
  }
  if (body.youtubeUrl !== undefined) {
    if (typeof body.youtubeUrl !== 'string' || !body.youtubeUrl.trim()) {
      return NextResponse.json({ error: 'youtubeUrl must be a non-empty string.' }, { status: 400 })
    }
    update.youtubeUrl = body.youtubeUrl.trim()
  }
  if (body.lyrics !== undefined) {
    update.lyrics = typeof body.lyrics === 'string' ? body.lyrics : ''
  }

  try {
    const updated = updateSong(body.id, update)
    if (!updated) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[/api/songs] Failed to update song:', err)
    return NextResponse.json({ error: 'Failed to update song.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  let body: { id?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.id !== 'string' || !isValidId(body.id)) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  try {
    const deleted = deleteSong(body.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/songs] Failed to delete song:', err)
    return NextResponse.json({ error: 'Failed to delete song.' }, { status: 500 })
  }
}
