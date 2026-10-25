import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { addHardToHearPhraseAsync, deleteHardToHearPhraseAsync, getHardToHearPhrasesAsync } from '@/app/lib/driveStore'
import { readJsonBody } from '@/app/lib/requestBody'

const UNAUTHORIZED = { error: 'Login om feature te gebruiken.' }
const VIDEO_REQUIRED = { error: 'video is required.' }

const videoName = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const video = videoName(req.nextUrl.searchParams.get('video'))
  if (!video) return NextResponse.json(VIDEO_REQUIRED, { status: 400 })

  try {
    return NextResponse.json({ phrases: await getHardToHearPhrasesAsync(video) })
  } catch (err) {
    console.error('[/api/luisteren/hard-to-hear] Failed to read phrases:', err)
    return NextResponse.json({ error: 'Kon frases niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const video = videoName(body.video)
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const { seconds, endSeconds } = body
  if (!video) return NextResponse.json(VIDEO_REQUIRED, { status: 400 })
  if (!text) return NextResponse.json({ error: 'text is required.' }, { status: 400 })
  if (!isSeconds(seconds) || !isSeconds(endSeconds) || endSeconds < seconds) {
    return NextResponse.json({ error: 'seconds and endSeconds must be non-negative numbers, endSeconds not before seconds.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ phrases: await addHardToHearPhraseAsync(video, text, seconds, endSeconds) })
  } catch (err) {
    console.error('[/api/luisteren/hard-to-hear] Failed to add phrase:', err)
    return NextResponse.json({ error: 'Kon frase niet opslaan.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const video = videoName(body.video)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!video) return NextResponse.json(VIDEO_REQUIRED, { status: 400 })
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json({ phrases: await deleteHardToHearPhraseAsync(video, id) })
  } catch (err) {
    console.error('[/api/luisteren/hard-to-hear] Failed to delete phrase:', err)
    return NextResponse.json({ error: 'Kon frase niet verwijderen.' }, { status: 500 })
  }
}
