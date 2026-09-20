import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { renameTag, deleteTag } from '@/app/lib/driveStore'

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  let body: { oldTag?: unknown; newTag?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.oldTag !== 'string' || !body.oldTag.trim()) {
    return NextResponse.json({ error: 'oldTag must be a non-empty string.' }, { status: 400 })
  }
  if (typeof body.newTag !== 'string' || !body.newTag.trim()) {
    return NextResponse.json({ error: 'newTag must be a non-empty string.' }, { status: 400 })
  }

  try {
    const updated = await renameTag(body.oldTag, body.newTag)
    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    console.error('[/api/tags] Failed to rename tag:', err)
    return NextResponse.json({ error: 'Failed to rename tag.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  let body: { tag?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.tag !== 'string' || !body.tag.trim()) {
    return NextResponse.json({ error: 'tag must be a non-empty string.' }, { status: 400 })
  }

  try {
    const updated = await deleteTag(body.tag)
    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    console.error('[/api/tags] Failed to delete tag:', err)
    return NextResponse.json({ error: 'Failed to delete tag.' }, { status: 500 })
  }
}
