import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getHardToHearVideosAsync, getListeningRootFolderId } from '@/app/lib/driveListeningStore'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const rootFolderId = getListeningRootFolderId()
  if (!rootFolderId) return NextResponse.json({ error: 'Luisteren-map is niet geconfigureerd.' }, { status: 501 })

  try {
    return NextResponse.json({ videos: await getHardToHearVideosAsync(rootFolderId) })
  } catch (err) {
    console.error('[/api/luisteren/hard-to-hear/videos] Failed to list videos:', err)
    return NextResponse.json({ error: 'Kon de video\'s niet laden.' }, { status: 500 })
  }
}
