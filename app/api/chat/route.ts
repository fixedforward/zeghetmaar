import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_MODEL, GRATIS_MODELS } from '@/app/config/models'
import { raceModels, fetchModel } from '@/app/lib/raceModels'
import { config } from '@/app/lib/config'

const OPENROUTER_API_KEY = config.aiProviders.openRouterApiKey

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
    const selectedModel = model || DEFAULT_MODEL
    const isGratis = GRATIS_MODELS.includes(selectedModel)
    const controller = new AbortController()
    const { response, model: winningModel } = isGratis
      ? await raceModels(selectedModel, messages, OPENROUTER_API_KEY)
      : await fetchModel(selectedModel, messages, OPENROUTER_API_KEY, controller.signal)
    console.log(`[/api/chat] Responding with winner: ${winningModel}`)
    return NextResponse.json({ response })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/chat] ${message}`)
    return NextResponse.json({ error: 'AI request niet gelukt. Alle modellen hebben gefaald.' }, { status: 502 })
  }
}
