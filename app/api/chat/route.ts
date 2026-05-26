import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { DEFAULT_MODEL } from '@/app/config/models'
import { raceModels } from '@/app/lib/raceModels'

// Resolve config from app/config.json as a fallback for local development.
// In production, set the OPENROUTER_API_KEY environment variable instead.
function loadConfig(): { openrouterApiKey?: string; model?: string } {
  try {
    const configPath = path.join(process.cwd(), 'app', 'config.json')
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    // Config file is optional — environment variables are preferred.
    return {}
  }
}

const config = loadConfig()

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || config.openrouterApiKey
const resolvedModel = config.model || DEFAULT_MODEL

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    console.error('[/api/chat] No OpenRouter API key found. Set OPENROUTER_API_KEY env var or add it to app/config.json.')
    return NextResponse.json({ error: 'Server misconfiguration: API key missing.' }, { status: 500 })
  }

  let body: { text?: string; prompt?: string; model?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { text, prompt, model } = body

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const messages = [
    { role: 'system', content: prompt },
    { role: 'user', content: text ?? '' },
  ]

  try {
    const { response, model: winningModel } = await raceModels(model || resolvedModel, messages, OPENROUTER_API_KEY)
    console.log(`[/api/chat] Responding with winner: ${winningModel}`)
    return NextResponse.json({ response })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/chat] ${message}`)
    return NextResponse.json({ error: 'AI request niet gelukt. Alle modellen hebben gefaald.' }, { status: 502 })
  }
}
