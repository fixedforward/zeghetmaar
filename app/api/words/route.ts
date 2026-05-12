import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORDS_PATH = path.join(process.cwd(), 'public', 'woordenlijst.json')

interface WordEntry {
  id: number
  word: string
  translation: string
  examples: string[]
}

function readWords(): WordEntry[] {
  const raw = fs.readFileSync(WORDS_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeWords(words: WordEntry[]): void {
  fs.writeFileSync(WORDS_PATH, JSON.stringify(words, null, 2) + '\n', 'utf8')
}

function nextId(words: WordEntry[]): number {
  if (words.length === 0) return 1
  return Math.max(...words.map(w => w.id)) + 1
}

export async function GET() {
  try {
    const words = readWords()
    return NextResponse.json(words)
  } catch (err) {
    console.error('[/api/words] Failed to read words:', err)
    return NextResponse.json({ error: 'Failed to read word list.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { word?: string; translation?: string; examples?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { word, translation, examples } = body

  if (!word || !translation) {
    return NextResponse.json({ error: 'word and translation are required.' }, { status: 400 })
  }

  try {
    const words = readWords()
    const entry: WordEntry = {
      id: nextId(words),
      word: word.trim(),
      translation: translation.trim(),
      examples: Array.isArray(examples) ? examples.map(e => e.trim()).filter(Boolean) : [],
    }
    words.push(entry)
    writeWords(words)
    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('[/api/words] Failed to add word:', err)
    return NextResponse.json({ error: 'Failed to add word.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  let body: { id?: number; word?: string; translation?: string; examples?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { id, word, translation, examples } = body

  if (id == null) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  try {
    const words = readWords()
    const index = words.findIndex(w => w.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 })
    }

    if (word !== undefined) words[index].word = word.trim()
    if (translation !== undefined) words[index].translation = translation.trim()
    if (examples !== undefined) words[index].examples = examples.map(e => e.trim()).filter(Boolean)

    writeWords(words)
    return NextResponse.json(words[index])
  } catch (err) {
    console.error('[/api/words] Failed to update word:', err)
    return NextResponse.json({ error: 'Failed to update word.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  let body: { id?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { id } = body

  if (id == null) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  try {
    const words = readWords()
    const index = words.findIndex(w => w.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Word not found.' }, { status: 404 })
    }

    words.splice(index, 1)
    writeWords(words)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/words] Failed to delete word:', err)
    return NextResponse.json({ error: 'Failed to delete word.' }, { status: 500 })
  }
}
