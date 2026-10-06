import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMarkedFileIdsAsync, isMarkedFileKind, setFileMarkedAsync } from '@/app/lib/driveStore'

type Context = { params: Promise<{ kind: string }> }

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { kind } = await params
  if (!isMarkedFileKind(kind)) return NextResponse.json({ error: 'Unknown marked-file kind.' }, { status: 400 })

  try {
    const fileIds = await getMarkedFileIdsAsync(kind)
    return NextResponse.json({ fileIds })
  } catch (err) {
    console.error(`[/api/marked-files/${kind}] Failed to read marked files:`, err)
    return NextResponse.json({ error: 'Kon afgevinkte bestanden niet laden.' }, { status: 500 })
  }
}

async function parseFileId(req: NextRequest): Promise<string | null> {
  let body: { fileId?: unknown }
  try {
    body = await req.json()
  } catch {
    return null
  }
  return typeof body.fileId === 'string' && body.fileId ? body.fileId : null
}

async function setMarkedAsync(req: NextRequest, { params }: Context, marked: boolean) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { kind } = await params
  if (!isMarkedFileKind(kind)) return NextResponse.json({ error: 'Unknown marked-file kind.' }, { status: 400 })

  const fileId = await parseFileId(req)
  if (!fileId) return NextResponse.json({ error: 'fileId is required.' }, { status: 400 })

  try {
    const fileIds = await setFileMarkedAsync(kind, fileId, marked)
    return NextResponse.json({ fileIds })
  } catch (err) {
    console.error(`[/api/marked-files/${kind}] Failed to ${marked ? 'mark' : 'unmark'} file:`, err)
    return NextResponse.json({ error: 'Kon niet opslaan.' }, { status: 500 })
  }
}

export function POST(req: NextRequest, context: Context) {
  return setMarkedAsync(req, context, true)
}

export function DELETE(req: NextRequest, context: Context) {
  return setMarkedAsync(req, context, false)
}
