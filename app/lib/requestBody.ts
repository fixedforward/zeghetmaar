import type { NextRequest } from 'next/server'

// The request's JSON body as an object; an empty object when it's missing or not JSON.
export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}
