/**
 * Startup wrapper: launches Next.js (JSON file store, no external DB needed).
 * Usage:  tsx scripts/startup.ts dev | start
 */
import { spawn } from 'child_process'

const mode = process.argv[2] ?? 'dev'

if (mode !== 'dev' && mode !== 'start') {
  console.error(`[startup] Unknown mode "${mode}". Use "dev" or "start".`)
  process.exit(1)
}

async function main() {
  const child = spawn('npx', ['next', mode], {
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main()
