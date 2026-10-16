import { describe, it, expect } from 'vitest'
import { parseMistakesTsv, setTimesPracticedInTsv, orderLeastPracticedFirst, MistakeRowMismatchError } from '../lib/mistakes'
import type { Mistake } from '../types'

const TSV = [
  'Mijn fout\tMogelijke verbetering\tType fout\tnoOfTimesPracticed',
  'ik ben eens met jou\tIk ben het eens met jou.\tGrammar fix\t0',
  '',
  'De mensen zou bestijden\tDe mensen zouden bestrijden\tBoth\t2',
  '',
].join('\n')

describe('parseMistakesTsv', () => {
  it('reads each row by header name, keeping its line index', () => {
    expect(parseMistakesTsv(TSV)).toEqual([
      { row: 1, mistake: 'ik ben eens met jou', correction: 'Ik ben het eens met jou.', type: 'Grammar fix', timesPracticed: 0 },
      { row: 3, mistake: 'De mensen zou bestijden', correction: 'De mensen zouden bestrijden', type: 'Both', timesPracticed: 2 },
    ])
  })

  it('finds the columns in any order and treats an empty count as 0', () => {
    const text = '﻿noOfTimesPracticed\tMogelijke verbetering\tMijn fout\r\n\tGoed.\tFout.\r\n'

    expect(parseMistakesTsv(text)).toEqual([{ row: 1, mistake: 'Fout.', correction: 'Goed.', type: '', timesPracticed: 0 }])
  })

  it('throws when a required column is missing', () => {
    expect(() => parseMistakesTsv('Mijn fout\tType fout\nx\ty')).toThrow(/Mogelijke verbetering, noOfTimesPracticed/)
  })
})

describe('setTimesPracticedInTsv', () => {
  it('changes only that row\'s count and keeps the rest of the file', () => {
    const updated = setTimesPracticedInTsv(TSV, 3, 'De mensen zou bestijden', 3)

    expect(updated).toBe(TSV.replace('Both\t2', 'Both\t3'))
  })

  it('keeps Windows line endings and fills a missing count cell', () => {
    const text = 'Mijn fout\tMogelijke verbetering\tnoOfTimesPracticed\r\nFout.\tGoed.\r\n'

    expect(setTimesPracticedInTsv(text, 1, 'Fout.', 1)).toBe('Mijn fout\tMogelijke verbetering\tnoOfTimesPracticed\r\nFout.\tGoed.\t1\r\n')
  })

  it('refuses when the row holds a different mistake, or does not exist', () => {
    expect(() => setTimesPracticedInTsv(TSV, 1, 'iets anders', 1)).toThrow(MistakeRowMismatchError)
    expect(() => setTimesPracticedInTsv(TSV, 0, 'Mijn fout', 1)).toThrow(MistakeRowMismatchError)
    expect(() => setTimesPracticedInTsv(TSV, 99, 'x', 1)).toThrow(MistakeRowMismatchError)
  })
})

describe('orderLeastPracticedFirst', () => {
  it('puts the least practiced mistakes first', () => {
    const make = (row: number, timesPracticed: number): Mistake => ({ row, mistake: `m${row}`, correction: '', type: '', timesPracticed })

    const ordered = orderLeastPracticedFirst([make(1, 3), make(2, 0), make(3, 1), make(4, 0)])

    expect(ordered.map(m => m.timesPracticed)).toEqual([0, 0, 1, 3])
    expect(ordered.slice(0, 2).map(m => m.row).sort()).toEqual([2, 4])
  })
})
