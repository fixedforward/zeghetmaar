import type { QuizFile } from '../types'

export interface QuizFileGroup {
  date: string | null // 'YYYY-MM-DD' extracted from the filename, or null if none found
  files: QuizFile[]
}

const DATE_IN_NAME = /(\d{4}-\d{2}-\d{2})/

// Groups consecutive files that share the same date extracted from their
// filename, preserving the list's existing order (files.list already returns
// them name-desc, so same-day files are already adjacent in practice).
export function groupQuizFilesByDate(files: QuizFile[]): QuizFileGroup[] {
  const groups: QuizFileGroup[] = []

  for (const file of files) {
    const match = file.name.match(DATE_IN_NAME)
    const date = match ? match[1] : null
    const last = groups[groups.length - 1]
    if (last && last.date === date) {
      last.files.push(file)
    } else {
      groups.push({ date, files: [file] })
    }
  }

  return groups
}
