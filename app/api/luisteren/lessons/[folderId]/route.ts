import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isDriveId } from '@/app/lib/driveArticleStore'
import { getListeningLessonAsync } from '@/app/lib/driveListeningStore'

export async function GET(req: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { folderId } = await params
  const fileId = req.nextUrl.searchParams.get('file') ?? ''
  if (!isDriveId(folderId) || !isDriveId(fileId)) {
    return NextResponse.json({ error: 'Ongeldige map of bestand.' }, { status: 400 })
  }

  try {
    const lesson = await getListeningLessonAsync(folderId, fileId)
    if (!lesson) return NextResponse.json({ error: 'Video of audio niet gevonden in deze map.' }, { status: 404 })
    return NextResponse.json(lesson)
  } catch (err) {
    console.error('[/api/luisteren/lessons/[folderId]] Failed to load lesson:', err)
    return NextResponse.json({ error: 'Kon les niet laden.' }, { status: 500 })
  }
}
