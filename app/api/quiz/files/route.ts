import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listQuizFilesAsync, isQuizConfigured } from '@/app/lib/driveQuizStore'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om quiz te gebruiken.' }, { status: 401 })

  if (!isQuizConfigured()) {
    return NextResponse.json({ error: 'Quiz-map is niet geconfigureerd.' }, { status: 501 })
  }

  try {
    const files = await listQuizFilesAsync()
    return NextResponse.json(files)
  } catch (err) {
    console.error('[/api/quiz/files] Failed to list quiz files:', err)
    return NextResponse.json({ error: 'Kon bestandenlijst niet laden.' }, { status: 500 })
  }
}
