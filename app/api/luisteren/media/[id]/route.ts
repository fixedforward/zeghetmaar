import { Readable } from 'stream'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isDriveId } from '@/app/lib/driveArticleStore'
import { getDriveMediaAsync, isMediaMimeType } from '@/app/lib/driveListeningStore'

const FORWARDED_HEADERS = ['content-type', 'content-length', 'content-range']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { id } = await params
  if (!isDriveId(id)) return NextResponse.json({ error: 'Ongeldig bestand.' }, { status: 400 })

  try {
    const media = await getDriveMediaAsync(id, req.headers.get('range'))
    if (!isMediaMimeType(media.headers['content-type'])) {
      media.stream.destroy()
      return NextResponse.json({ error: 'Geen audio- of videobestand.' }, { status: 415 })
    }

    const headers = new Headers({ 'Accept-Ranges': 'bytes' })
    for (const name of FORWARDED_HEADERS) {
      const value = media.headers[name]
      if (value) headers.set(name, value)
    }
    return new Response(Readable.toWeb(media.stream) as unknown as ReadableStream<Uint8Array>, { status: media.status, headers })
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status
    console.error('[/api/luisteren/media/[id]] Failed to stream file:', err)
    return NextResponse.json({ error: 'Kon bestand niet laden.' }, { status: status === 404 || status === 416 ? status : 500 })
  }
}
