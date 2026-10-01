import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getArticlesRootFolderId, listArticleFolderAsync } from '@/app/lib/driveArticleStore'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om artikelen te lezen.' }, { status: 401 })

  const rootFolderId = getArticlesRootFolderId()
  if (!rootFolderId) {
    return NextResponse.json({ error: 'Artikelen-map is niet geconfigureerd.' }, { status: 501 })
  }

  const folderId = request.nextUrl.searchParams.get('folderId') ?? rootFolderId
  if (!/^[A-Za-z0-9_-]+$/.test(folderId)) {
    return NextResponse.json({ error: 'Ongeldige map.' }, { status: 400 })
  }

  try {
    return NextResponse.json(await listArticleFolderAsync(folderId))
  } catch (err) {
    console.error('[/api/articles] Failed to list folder:', err)
    return NextResponse.json({ error: 'Kon artikelenlijst niet laden.' }, { status: 500 })
  }
}
