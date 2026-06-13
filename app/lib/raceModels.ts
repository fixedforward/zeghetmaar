import { GRATIS_MODELS } from '../config/models'

export const RACE_BATCH_SIZE = 5
export const RACE_TIMEOUT_MS = 5000

export interface RaceWinner {
  response: string
  model: string
}

export async function fetchModel(
  model: string,
  messages: { role: string; content: string }[],
  apiKey: string,
  signal: AbortSignal
): Promise<RaceWinner> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Dutch Rewriter',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal,
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Model ${model} returned HTTP ${res.status}: ${detail}`)
  }

  const data = await res.json()
  const response: string = data.choices[0].message.content
  return { response, model }
}

export async function raceModels(
  preferredModel: string,
  messages: { role: string; content: string }[],
  apiKey: string,
  {
    batchSize = RACE_BATCH_SIZE,
    timeoutMs = RACE_TIMEOUT_MS,
    models = GRATIS_MODELS,
  }: { batchSize?: number; timeoutMs?: number; models?: string[] } = {}
): Promise<RaceWinner> {
  // Build ordered pool: preferred model first, then the rest (deduplicated)
  const pool = [preferredModel, ...models.filter(m => m !== preferredModel)]

  for (let i = 0; i < pool.length; i += batchSize) {
    const batch = pool.slice(i, i + batchSize)
    const controllers = batch.map(() => new AbortController())

    const batchPromise = Promise.any(
      batch.map((model, idx) =>
        Promise.race([
          fetchModel(model, messages, apiKey, controllers[idx].signal),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              controllers[idx].abort()
              reject(new Error(`Model ${model} timed out`))
            }, timeoutMs)
          ),
        ])
      )
    )

    try {
      const winner = await batchPromise
      controllers.forEach(c => c.abort())
      console.log(`[raceModels] Winner: ${winner.model} (batch ${Math.floor(i / batchSize) + 1})`)
      return winner
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[raceModels] Batch ${Math.floor(i / batchSize) + 1} failed: ${message}, trying next`)
    }
  }

  throw new Error('All model batches exhausted with no successful response')
}
