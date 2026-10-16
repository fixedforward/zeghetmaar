import type { Mistake } from '../types'
import { shuffleArray } from './shuffle'

export const MISTAKE_COLUMN = 'Mijn fout'
export const CORRECTION_COLUMN = 'Mogelijke verbetering'
export const TYPE_COLUMN = 'Type fout'
export const TIMES_PRACTICED_COLUMN = 'noOfTimesPracticed'

export class MistakeRowMismatchError extends Error {}

interface Columns {
  mistake: number
  correction: number
  type: number
  timesPracticed: number
}

function splitLines(text: string): { lines: string[]; eol: string } {
  return { lines: text.split(/\r?\n/), eol: text.includes('\r\n') ? '\r\n' : '\n' }
}

function findColumns(headerLine: string): Columns {
  const header = headerLine.replace(/^﻿/, '').split('\t').map(h => h.trim().toLowerCase())
  const indexOf = (name: string) => header.indexOf(name.toLowerCase())
  const columns = {
    mistake: indexOf(MISTAKE_COLUMN),
    correction: indexOf(CORRECTION_COLUMN),
    type: indexOf(TYPE_COLUMN),
    timesPracticed: indexOf(TIMES_PRACTICED_COLUMN),
  }
  const missing = [
    [MISTAKE_COLUMN, columns.mistake],
    [CORRECTION_COLUMN, columns.correction],
    [TIMES_PRACTICED_COLUMN, columns.timesPracticed],
  ].filter(([, index]) => index === -1).map(([name]) => name)
  if (missing.length > 0) throw new Error(`Mistakes file is missing columns: ${missing.join(', ')}`)
  return columns
}

function parseCount(value: string | undefined): number {
  const count = Number.parseInt(value ?? '', 10)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function parseMistakesTsv(text: string): Mistake[] {
  const { lines } = splitLines(text)
  const columns = findColumns(lines[0] ?? '')
  const mistakes: Mistake[] = []
  lines.forEach((line, row) => {
    if (row === 0) return
    const cells = line.split('\t')
    const mistake = cells[columns.mistake]?.trim()
    if (!mistake) return
    mistakes.push({
      row,
      mistake,
      correction: cells[columns.correction]?.trim() ?? '',
      type: columns.type === -1 ? '' : cells[columns.type]?.trim() ?? '',
      timesPracticed: parseCount(cells[columns.timesPracticed]),
    })
  })
  return mistakes
}

// Only the one cell changes, so the rest of the file (other columns, line endings) stays as it was.
// The mistake text is checked too, so an edit to the file since it was loaded can't update the wrong row.
export function setTimesPracticedInTsv(text: string, row: number, mistake: string, timesPracticed: number): string {
  const { lines, eol } = splitLines(text)
  const columns = findColumns(lines[0] ?? '')
  if (row < 1 || row >= lines.length) throw new MistakeRowMismatchError(`Row ${row} does not exist.`)
  const cells = lines[row].split('\t')
  if (cells[columns.mistake]?.trim() !== mistake.trim()) {
    throw new MistakeRowMismatchError(`Row ${row} no longer holds this mistake.`)
  }
  while (cells.length <= columns.timesPracticed) cells.push('')
  cells[columns.timesPracticed] = String(timesPracticed)
  lines[row] = cells.join('\t')
  return lines.join(eol)
}

export function orderLeastPracticedFirst(mistakes: Mistake[]): Mistake[] {
  return shuffleArray(mistakes).sort((a, b) => a.timesPracticed - b.timesPracticed)
}
