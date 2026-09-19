import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listQuizFilesAsync, isQuizConfigured } from '@/app/lib/driveQuizStore'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om quiz te gebruiken.' }, { status: 401 })

  if (!isQuizConfigured()) {
    return NextResponse.json({ error: 'Quiz-map is niet geconfigureerd.' }, { status: 501 })
  }

  const pageToken = request.nextUrl.searchParams.get('pageToken') ?? undefined

  try {
    const page = await listQuizFilesAsync(pageToken)
    return NextResponse.json(page)
  } catch (err) {
    console.error('[/api/quiz/files] Failed to list quiz files:', err)
    return NextResponse.json({ error: 'Kon bestandenlijst niet laden.' }, { status: 500 })
  }
}
