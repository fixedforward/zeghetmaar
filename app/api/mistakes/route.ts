import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMistakesAsync, isMistakesConfigured, setTimesPracticedAsync } from '@/app/lib/driveMistakeStore'
import { MistakeRowMismatchError } from '@/app/lib/mistakes'

const NOT_CONFIGURED = 'Foutenbestand is niet geconfigureerd.'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Log in om je fouten te oefenen.' }, { status: 401 })
  if (!isMistakesConfigured()) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 501 })

  try {
    return NextResponse.json({ mistakes: await getMistakesAsync() })
  } catch (err) {
    console.error('[/api/mistakes] Failed to read mistakes:', err)
    return NextResponse.json({ error: 'Kon fouten niet laden.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Log in om je fouten te oefenen.' }, { status: 401 })
  if (!isMistakesConfigured()) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 501 })

  const body = await request.json().catch(() => null)
  const { row, mistake, timesPracticed } = body ?? {}
  if (!Number.isInteger(row) || typeof mistake !== 'string' || !Number.isInteger(timesPracticed) || timesPracticed < 0) {
    return NextResponse.json({ error: 'Ongeldige gegevens.' }, { status: 400 })
  }

  try {
    await setTimesPracticedAsync(row, mistake, timesPracticed)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MistakeRowMismatchError) {
      return NextResponse.json({ error: 'Het foutenbestand is intussen gewijzigd. Laad de fouten opnieuw.' }, { status: 409 })
    }
    console.error('[/api/mistakes] Failed to update mistake:', err)
    return NextResponse.json({ error: 'Kon de teller niet opslaan.' }, { status: 500 })
  }
}
