import { NextResponse } from 'next/server'

// Simple liveness check — no external calls, no API tokens consumed.
export function GET() {
  return NextResponse.json({ ok: true })
}
