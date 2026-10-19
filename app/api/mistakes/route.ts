import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteMistakeAsync, getMistakesAsync, isMistakesConfigured, updateMistakeAsync } from '@/app/lib/driveMistakeStore'
import { cleanCell, MistakeRowMismatchError } from '@/app/lib/mistakes'

const NOT_CONFIGURED = 'Foutenbestand is niet geconfigureerd.'
const FILE_CHANGED = 'Het foutenbestand is intussen gewijzigd. Laad de fouten opnieuw.'
const NO_EDIT_ACCESS = 'De app mag het foutenbestand niet bewerken. Deel het in Drive als Editor met het service-account.'

// Drive answers 403 when the service account can only view the file.
function isNoEditAccess(err: unknown): boolean {
  const { status, code } = (err ?? {}) as { status?: unknown; code?: unknown }
  return status === 403 || code === 403 || code === '403'
}

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
  const { row, mistake, timesPracticed, correction } = body ?? {}
  const validCount = timesPracticed === undefined || (Number.isInteger(timesPracticed) && timesPracticed >= 0)
  const validCorrection = correction === undefined || (typeof correction === 'string' && cleanCell(correction) !== '')
  const hasChange = timesPracticed !== undefined || correction !== undefined
  if (!Number.isInteger(row) || typeof mistake !== 'string' || !validCount || !validCorrection || !hasChange) {
    return NextResponse.json({ error: 'Ongeldige gegevens.' }, { status: 400 })
  }

  try {
    await updateMistakeAsync(row, mistake, { timesPracticed, correction })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MistakeRowMismatchError) {
      return NextResponse.json({ error: FILE_CHANGED }, { status: 409 })
    }
    if (isNoEditAccess(err)) return NextResponse.json({ error: NO_EDIT_ACCESS }, { status: 403 })
    console.error('[/api/mistakes] Failed to update mistake:', err)
    return NextResponse.json({ error: 'Kon de wijziging niet opslaan.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Log in om je fouten te oefenen.' }, { status: 401 })
  if (!isMistakesConfigured()) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 501 })

  const body = await request.json().catch(() => null)
  const { row, mistake } = body ?? {}
  if (!Number.isInteger(row) || typeof mistake !== 'string') {
    return NextResponse.json({ error: 'Ongeldige gegevens.' }, { status: 400 })
  }

  try {
    await deleteMistakeAsync(row, mistake)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MistakeRowMismatchError) return NextResponse.json({ error: FILE_CHANGED }, { status: 409 })
    if (isNoEditAccess(err)) return NextResponse.json({ error: NO_EDIT_ACCESS }, { status: 403 })
    console.error('[/api/mistakes] Failed to delete mistake:', err)
    return NextResponse.json({ error: 'Kon de fout niet verwijderen.' }, { status: 500 })
  }
}
