import { Readable } from 'stream'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isDriveId } from '@/app/lib/driveArticleStore'
import { getDriveMediaAsync } from '@/app/lib/driveListeningStore'
import { isImageMimeType } from '@/app/lib/drivePictureStore'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { id } = await params
  if (!isDriveId(id)) return NextResponse.json({ error: 'Ongeldig bestand.' }, { status: 400 })

  try {
    const media = await getDriveMediaAsync(id, null)
    const contentType = media.headers['content-type']
    if (!isImageMimeType(contentType)) {
      media.stream.destroy()
      return NextResponse.json({ error: 'Geen afbeelding.' }, { status: 415 })
    }

    const headers = new Headers({ 'Content-Type': contentType!, 'Cache-Control': 'private, max-age=86400' })
    const length = media.headers['content-length']
    if (length) headers.set('Content-Length', length)
    return new Response(Readable.toWeb(media.stream) as unknown as ReadableStream<Uint8Array>, { status: 200, headers })
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status
    console.error('[/api/pictures/[id]] Failed to load picture:', err)
    return NextResponse.json({ error: 'Kon afbeelding niet laden.' }, { status: status === 404 ? 404 : 500 })
  }
}
