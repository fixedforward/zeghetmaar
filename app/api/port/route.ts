import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// This route reads server/port.json written by the backend on startup,
// so the frontend always knows which port the backend is running on.
export async function GET() {
  try {
    const portFile = path.join(process.cwd(), 'server', 'port.json')
    const { port } = JSON.parse(fs.readFileSync(portFile, 'utf8'))
    return NextResponse.json({ port })
  } catch {
    // Fall back to 9292 if the file doesn't exist yet
    return NextResponse.json({ port: 9292 })
  }
}
