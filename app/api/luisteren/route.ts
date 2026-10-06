import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { addListeningLinkAsync, deleteListeningLinkAsync, getListeningLinksAsync } from '@/app/lib/driveStore'
import { isYouTubeUrl } from '@/app/lib/youtube'

const UNAUTHORIZED = { error: 'Login om feature te gebruiken.' }

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  try {
    return NextResponse.json({ links: await getListeningLinksAsync() })
  } catch (err) {
    console.error('[/api/luisteren] Failed to read links:', err)
    return NextResponse.json({ error: 'Kon links niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readBody(req)
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!isYouTubeUrl(url)) return NextResponse.json({ error: 'Geef een geldige YouTube-link op.' }, { status: 400 })

  try {
    return NextResponse.json({ links: await addListeningLinkAsync(title, url) })
  } catch (err) {
    console.error('[/api/luisteren] Failed to add link:', err)
    return NextResponse.json({ error: 'Kon link niet opslaan.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json({ links: await deleteListeningLinkAsync(id) })
  } catch (err) {
    console.error('[/api/luisteren] Failed to delete link:', err)
    return NextResponse.json({ error: 'Kon link niet verwijderen.' }, { status: 500 })
  }
}
