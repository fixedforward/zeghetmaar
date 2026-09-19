import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPracticedDatesAsync, markPracticedDateAsync, unmarkPracticedDateAsync } from '@/app/lib/driveStore'
import { isValidIsoDate, isPracticeLogType } from '@/app/lib/practiceLog'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { type } = await params
  if (!isPracticeLogType(type)) {
    return NextResponse.json({ error: 'Unknown practice log type.' }, { status: 400 })
  }

  try {
    const dates = await getPracticedDatesAsync(type)
    return NextResponse.json({ dates })
  } catch (err) {
    console.error('[/api/practice-log] Failed to read practice log:', err)
    return NextResponse.json({ error: 'Kon oefenlog niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { type } = await params
  if (!isPracticeLogType(type)) {
    return NextResponse.json({ error: 'Unknown practice log type.' }, { status: 400 })
  }

  let body: { date?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.date !== 'string' || !isValidIsoDate(body.date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format.' }, { status: 400 })
  }

  try {
    const dates = await markPracticedDateAsync(type, body.date)
    return NextResponse.json({ dates })
  } catch (err) {
    console.error('[/api/practice-log] Failed to mark practiced date:', err)
    return NextResponse.json({ error: 'Kon oefenlog niet opslaan.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const { type } = await params
  if (!isPracticeLogType(type)) {
    return NextResponse.json({ error: 'Unknown practice log type.' }, { status: 400 })
  }

  let body: { date?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body.date !== 'string' || !isValidIsoDate(body.date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format.' }, { status: 400 })
  }

  try {
    const dates = await unmarkPracticedDateAsync(type, body.date)
    return NextResponse.json({ dates })
  } catch (err) {
    console.error('[/api/practice-log] Failed to unmark practiced date:', err)
    return NextResponse.json({ error: 'Kon oefenlog niet bijwerken.' }, { status: 500 })
  }
}
