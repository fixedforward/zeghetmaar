import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getArticleAsync } from '@/app/lib/driveArticleStore'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om artikelen te lezen.' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json(await getArticleAsync(id))
  } catch (err) {
    console.error('[/api/articles/[id]] Failed to load article:', err)
    return NextResponse.json({ error: 'Kon artikel niet laden.' }, { status: 500 })
  }
}
