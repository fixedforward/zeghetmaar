import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getQuizPairsAsync } from '@/app/lib/driveQuizStore'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om quiz te gebruiken.' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    const pairs = await getQuizPairsAsync(id)
    return NextResponse.json(pairs)
  } catch (err) {
    console.error('[/api/quiz/files/[id]] Failed to load quiz file:', err)
    return NextResponse.json({ error: 'Kon quizbestand niet laden of verwerken.' }, { status: 500 })
  }
}
