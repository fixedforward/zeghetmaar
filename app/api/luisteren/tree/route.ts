import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getListeningRootFolderId, getListeningTreeAsync } from '@/app/lib/driveListeningStore'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const rootFolderId = getListeningRootFolderId()
  if (!rootFolderId) return NextResponse.json({ error: 'Luisteren-map is niet geconfigureerd.' }, { status: 501 })

  try {
    return NextResponse.json(await getListeningTreeAsync(rootFolderId))
  } catch (err) {
    console.error('[/api/luisteren/tree] Failed to list folder tree:', err)
    return NextResponse.json({ error: 'Kon de luistermap niet laden.' }, { status: 500 })
  }
}
