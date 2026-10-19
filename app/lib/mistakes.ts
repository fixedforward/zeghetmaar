import type { Mistake } from '../types'
import { shuffleArray } from './shuffle'

export const MISTAKE_COLUMN = 'Mijn fout'
export const CORRECTION_COLUMN = 'Mogelijke verbetering'
export const TYPE_COLUMN = 'Type fout'
export const TIMES_PRACTICED_COLUMN = 'noOfTimesPracticed'
export const TRANSLATION_COLUMN = 'englishTranslation'
export const REWORDING_COLUMN = 'herformulering'

export class MistakeRowMismatchError extends Error {}

interface Columns {
  mistake: number
  correction: number
  type: number
  timesPracticed: number
  translation: number
  rewording: number
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
    translation: indexOf(TRANSLATION_COLUMN),
    rewording: indexOf(REWORDING_COLUMN),
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
      translation: columns.translation === -1 ? '' : cells[columns.translation]?.trim() ?? '',
      rewording: columns.rewording === -1 ? '' : cells[columns.rewording]?.trim() ?? '',
    })
  })
  return mistakes
}

// The mistake text is checked too, so an edit to the file since it was loaded can't change the wrong row.
function findRow(text: string, row: number, mistake: string) {
  const { lines, eol } = splitLines(text)
  const columns = findColumns(lines[0] ?? '')
  if (row < 1 || row >= lines.length) throw new MistakeRowMismatchError(`Row ${row} does not exist.`)
  const cells = lines[row].split('\t')
  if (cells[columns.mistake]?.trim() !== mistake.trim()) {
    throw new MistakeRowMismatchError(`Row ${row} no longer holds this mistake.`)
  }
  return { lines, eol, columns, cells }
}

export interface MistakeChanges {
  timesPracticed?: number
  correction?: string
}

// A tab or line break inside a cell would break the TSV columns.
export function cleanCell(value: string): string {
  return value.split(/\s+/).filter(Boolean).join(' ')
}

// Only the changed cells change, so the rest of the file (other columns, line endings) stays as it was.
export function updateMistakeInTsv(text: string, row: number, mistake: string, changes: MistakeChanges): string {
  const { lines, eol, columns, cells } = findRow(text, row, mistake)
  const setCell = (index: number, value: string) => {
    while (cells.length <= index) cells.push('')
    cells[index] = value
  }
  if (changes.timesPracticed !== undefined) setCell(columns.timesPracticed, String(changes.timesPracticed))
  if (changes.correction !== undefined) setCell(columns.correction, cleanCell(changes.correction))
  lines[row] = cells.join('\t')
  return lines.join(eol)
}

export function deleteRowFromTsv(text: string, row: number, mistake: string): string {
  const { lines, eol } = findRow(text, row, mistake)
  lines.splice(row, 1)
  return lines.join(eol)
}

// After a row is deleted, every row below it moves up one line.
export function shiftRowsAfterDelete<T extends { row: number }>(items: T[], deletedRow: number): T[] {
  return items.filter(item => item.row !== deletedRow).map(item => item.row > deletedRow ? { ...item, row: item.row - 1 } : item)
}

// Which sentences to practice, by how many times they were marked Goed (noOfTimesPracticed).
export type PracticedFilter = 'alle' | '0' | '1' | '2' | '3+'

export const PRACTICED_FILTER_OPTIONS: { value: PracticedFilter; label: string }[] = [
  { value: 'alle', label: 'alle' },
  { value: '0', label: '0× goed' },
  { value: '1', label: '1× goed' },
  { value: '2', label: '2× goed' },
  { value: '3+', label: '3× of vaker goed' },
]

export function matchesPracticedFilter(mistake: Pick<Mistake, 'timesPracticed'>, filter: PracticedFilter): boolean {
  if (filter === 'alle') return true
  if (filter === '3+') return mistake.timesPracticed >= 3
  return mistake.timesPracticed === Number(filter)
}

export function orderLeastPracticedFirst(mistakes: Mistake[]): Mistake[] {
  return shuffleArray(mistakes).sort((a, b) => a.timesPracticed - b.timesPracticed)
}
