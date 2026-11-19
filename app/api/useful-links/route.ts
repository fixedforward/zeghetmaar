import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  addUsefulLinkAsync,
  deleteUsefulLinkAsync,
  getUsefulLinksAsync,
  updateUsefulLinkAsync,
  type UsefulLinkUpdate,
} from '@/app/lib/driveStore'
import { parseWebUrl } from '@/app/lib/url'
import { readJsonBody } from '@/app/lib/requestBody'

const UNAUTHORIZED = { error: 'Login om feature te gebruiken.' }
const INVALID_URL = { error: 'Geef een geldige link op (http of https).' }

const trimmed = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  try {
    return NextResponse.json({ links: await getUsefulLinksAsync() })
  } catch (err) {
    console.error('[/api/useful-links] Failed to read links:', err)
    return NextResponse.json({ error: 'Kon links niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const url = trimmed(body.url)
  if (!parseWebUrl(url)) return NextResponse.json(INVALID_URL, { status: 400 })

  try {
    return NextResponse.json({ links: await addUsefulLinkAsync(trimmed(body.title) || url, url) })
  } catch (err) {
    console.error('[/api/useful-links] Failed to add link:', err)
    return NextResponse.json({ error: 'Kon link niet opslaan.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const update: UsefulLinkUpdate = {}
  if ('title' in body) {
    const title = trimmed(body.title)
    if (!title) return NextResponse.json({ error: 'Vul een naam in.' }, { status: 400 })
    update.title = title
  }
  if ('url' in body) {
    const url = trimmed(body.url)
    if (!parseWebUrl(url)) return NextResponse.json(INVALID_URL, { status: 400 })
    update.url = url
  }

  try {
    return NextResponse.json({ links: await updateUsefulLinkAsync(id, update) })
  } catch (err) {
    console.error('[/api/useful-links] Failed to update link:', err)
    return NextResponse.json({ error: 'Kon link niet bijwerken.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json({ links: await deleteUsefulLinkAsync(id) })
  } catch (err) {
    console.error('[/api/useful-links] Failed to delete link:', err)
    return NextResponse.json({ error: 'Kon link niet verwijderen.' }, { status: 500 })
  }
}
