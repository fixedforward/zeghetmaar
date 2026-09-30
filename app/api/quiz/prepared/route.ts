import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPreparedQuizFileIdsAsync, setQuizFilePreparedAsync } from '@/app/lib/driveStore'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  try {
    const fileIds = await getPreparedQuizFileIdsAsync()
    return NextResponse.json({ fileIds })
  } catch (err) {
    console.error('[/api/quiz/prepared] Failed to read prepared quiz files:', err)
    return NextResponse.json({ error: 'Kon voorbereide bestanden niet laden.' }, { status: 500 })
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const fileId = await parseFileId(req)
  if (!fileId) return NextResponse.json({ error: 'fileId is required.' }, { status: 400 })

  try {
    const fileIds = await setQuizFilePreparedAsync(fileId, true)
    return NextResponse.json({ fileIds })
  } catch (err) {
    console.error('[/api/quiz/prepared] Failed to mark quiz file prepared:', err)
    return NextResponse.json({ error: 'Kon niet opslaan.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const fileId = await parseFileId(req)
  if (!fileId) return NextResponse.json({ error: 'fileId is required.' }, { status: 400 })

  try {
    const fileIds = await setQuizFilePreparedAsync(fileId, false)
    return NextResponse.json({ fileIds })
  } catch (err) {
    console.error('[/api/quiz/prepared] Failed to unmark quiz file prepared:', err)
    return NextResponse.json({ error: 'Kon niet opslaan.' }, { status: 500 })
  }
}
