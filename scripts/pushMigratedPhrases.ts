// One-off script: pushes the migrated `meanings` shape back to the live
// Drive file. Backs up the current raw content first, then forces a full
// rewrite via a no-op updateWord() call — updateWord() always re-serializes
// the ENTIRE list (already migrated in memory by getAllWords()), which is
// the same thing that would happen automatically on your next real edit.
import { writeFileSync } from 'fs'
import path from 'path'
import { getDriveClient, getAllWords, updateWord } from '../app/lib/driveStore'
import { config } from '../app/lib/config'

async function main() {
  const fileId = config.database.googleJsonFile.googleDriveFileId
  const drive = getDriveClient()

  const raw = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
  const backupPath = path.join(process.cwd(), 'scripts', 'pre-migration-backup.json')
  writeFileSync(backupPath, raw.data as string, 'utf-8')
  console.log(`Backed up current Drive content to ${backupPath}`)

  const words = await getAllWords()
  if (words.length === 0) {
    console.log('No phrases found — nothing to push.')
    return
  }

  const updated = await updateWord(words[0].id, {})
  if (!updated) throw new Error('updateWord returned null — push failed.')
  console.log(`Pushed ${words.length} migrated phrases back to Drive.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
