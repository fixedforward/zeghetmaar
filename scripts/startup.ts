/**
 * Startup wrapper: validates MongoDB connectivity before launching Next.js.
 * Usage:  tsx scripts/startup.ts dev | start
 */
import { spawn } from 'child_process'
import { initializeMongo } from '../app/lib/mongodb'

const mode = process.argv[2] ?? 'dev'

if (mode !== 'dev' && mode !== 'start') {
  console.error(`[startup] Unknown mode "${mode}". Use "dev" or "start".`)
  process.exit(1)
}

async function main() {
  console.log('[startup] Connecting to MongoDB Atlas...')
  try {
    await initializeMongo()
    console.log('[startup] MongoDB connected and index ensured. Starting Next.js...')
  } catch (err) {
    console.error('[startup] MongoDB connection failed — aborting startup.')
    console.error(err)
    process.exit(1)
  }

  const child = spawn('npx', ['next', mode], {
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main()
