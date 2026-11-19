import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { addNoteAsync, deleteNoteAsync, getNotesAsync, updateNoteAsync, type NoteUpdate } from '@/app/lib/driveStore'
import { readJsonBody } from '@/app/lib/requestBody'

const UNAUTHORIZED = { error: 'Login om feature te gebruiken.' }
const EMPTY_TEXT = { error: 'Schrijf een notitie.' }

const trimmed = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  try {
    return NextResponse.json({ notes: await getNotesAsync() })
  } catch (err) {
    console.error('[/api/notes] Failed to read notes:', err)
    return NextResponse.json({ error: 'Kon notities niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const text = trimmed(body.text)
  if (!text) return NextResponse.json(EMPTY_TEXT, { status: 400 })

  try {
    return NextResponse.json({ notes: await addNoteAsync(trimmed(body.title), text) })
  } catch (err) {
    console.error('[/api/notes] Failed to add note:', err)
    return NextResponse.json({ error: 'Kon notitie niet opslaan.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const update: NoteUpdate = {}
  if ('title' in body) update.title = trimmed(body.title)
  if ('text' in body) {
    const text = trimmed(body.text)
    if (!text) return NextResponse.json(EMPTY_TEXT, { status: 400 })
    update.text = text
  }

  try {
    return NextResponse.json({ notes: await updateNoteAsync(id, update) })
  } catch (err) {
    console.error('[/api/notes] Failed to update note:', err)
    return NextResponse.json({ error: 'Kon notitie niet bijwerken.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json({ notes: await deleteNoteAsync(id) })
  } catch (err) {
    console.error('[/api/notes] Failed to delete note:', err)
    return NextResponse.json({ error: 'Kon notitie niet verwijderen.' }, { status: 500 })
  }
}
