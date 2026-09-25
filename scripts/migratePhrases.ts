// One-off script: reads the live phrase list from Google Drive (already
// upgraded in memory to the `meanings` shape by driveStore's migrate()) and
// writes it to a local JSON file for inspection — does NOT write back to Drive.
import { writeFileSync } from 'fs'
import path from 'path'
import { getAllWords } from '../app/lib/driveStore'

async function main() {
  const words = await getAllWords()
  const outPath = path.join(process.cwd(), 'scripts', 'migrated-phrases.json')
  writeFileSync(outPath, JSON.stringify(words, null, 2) + '\n', 'utf-8')
  console.log(`Wrote ${words.length} migrated phrases to ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
