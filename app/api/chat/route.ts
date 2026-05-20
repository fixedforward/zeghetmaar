import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { auth } from '@/auth'
import { DEFAULT_MODEL } from '@/app/config/models'

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

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

  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Dutch Rewriter',
      },
      body: JSON.stringify({
        model: model || resolvedModel,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text ?? '' },
        ],
        stream: false,
        extra_body: { cache: true },
      }),
    })

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      console.error(`[/api/chat] OpenRouter returned HTTP ${openRouterRes.status}: ${detail}`)
      return NextResponse.json({ error: `AI request niet gelukt. Controleer logs voor details. Meest voorkomende oorzaak: je hebt geen geld voor deze model :)` }, { status: 502 })
    }

    const data = await openRouterRes.json()
    const aiResponse: string = data.choices[0].message.content
    const cached = openRouterRes.headers.get('openrouter-calculation-cache-hit') === 'true'

    return NextResponse.json({ response: aiResponse, cached })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/chat] Unexpected error: ${message}`)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
