import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  addLanguageIslandAsync,
  deleteLanguageIslandAsync,
  getLanguageIslandsAsync,
  updateLanguageIslandAsync,
  type LanguageIslandUpdate,
} from '@/app/lib/driveStore'
import { readJsonBody } from '@/app/lib/requestBody'

const UNAUTHORIZED = { error: 'Login om feature te gebruiken.' }

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  try {
    return NextResponse.json({ islands: await getLanguageIslandsAsync() })
  } catch (err) {
    console.error('[/api/language-islands] Failed to read islands:', err)
    return NextResponse.json({ error: 'Kon taaleilanden niet laden.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const english = typeof body.english === 'string' ? body.english.trim() : ''
  if (!english) return NextResponse.json({ error: 'Vul een Engelse frase in.' }, { status: 400 })

  try {
    return NextResponse.json({ islands: await addLanguageIslandAsync(english) })
  } catch (err) {
    console.error('[/api/language-islands] Failed to add island:', err)
    return NextResponse.json({ error: 'Kon taaleiland niet opslaan.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const update: LanguageIslandUpdate = {}
  if ('english' in body) {
    const english = typeof body.english === 'string' ? body.english.trim() : ''
    if (!english) return NextResponse.json({ error: 'Vul een Engelse frase in.' }, { status: 400 })
    update.english = english
  }
  if ('options' in body) {
    if (!Array.isArray(body.options) || !body.options.every(o => typeof o === 'string' && o.trim())) {
      return NextResponse.json({ error: 'options must be a list of non-empty strings.' }, { status: 400 })
    }
    update.options = body.options.map(o => (o as string).trim())
  }

  try {
    return NextResponse.json({ islands: await updateLanguageIslandAsync(id, update) })
  } catch (err) {
    console.error('[/api/language-islands] Failed to update island:', err)
    return NextResponse.json({ error: 'Kon taaleiland niet bijwerken.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json(UNAUTHORIZED, { status: 401 })

  const body = await readJsonBody(req)
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  try {
    return NextResponse.json({ islands: await deleteLanguageIslandAsync(id) })
  } catch (err) {
    console.error('[/api/language-islands] Failed to delete island:', err)
    return NextResponse.json({ error: 'Kon taaleiland niet verwijderen.' }, { status: 500 })
  }
}
