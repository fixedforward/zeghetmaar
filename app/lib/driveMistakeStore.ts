import { Readable } from 'stream'
import { getDriveClient } from './driveStore'
import { readDriveTextFileAsync } from './driveQuizStore'
import { config } from './config'
import { deleteRowFromTsv, parseMistakesTsv, setTimesPracticedInTsv } from './mistakes'
import type { Mistake } from '../types'

function getMistakesFileId(): string | undefined {
  return config.database.googleMistakesFile?.fileId
}

export function isMistakesConfigured(): boolean {
  return !!getMistakesFileId()
}

function requireMistakesFileId(): string {
  const fileId = getMistakesFileId()
  if (!fileId) throw new Error('Mistakes file is not configured.')
  return fileId
}

export async function getMistakesAsync(): Promise<Mistake[]> {
  return parseMistakesTsv(await readDriveTextFileAsync(requireMistakesFileId()))
}

async function updateMistakesFileAsync(change: (text: string) => string): Promise<void> {
  const fileId = requireMistakesFileId()
  const updated = change(await readDriveTextFileAsync(fileId))
  await getDriveClient().files.update({
    fileId,
    supportsAllDrives: true,
    media: { mimeType: 'text/tab-separated-values', body: Readable.from([updated]) },
  })
}

export async function setTimesPracticedAsync(row: number, mistake: string, timesPracticed: number): Promise<void> {
  await updateMistakesFileAsync(text => setTimesPracticedInTsv(text, row, mistake, timesPracticed))
}

export async function deleteMistakeAsync(row: number, mistake: string): Promise<void> {
  await updateMistakesFileAsync(text => deleteRowFromTsv(text, row, mistake))
}
