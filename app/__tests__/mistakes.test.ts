import { describe, it, expect } from 'vitest'
import { parseMistakesTsv, updateMistakeInTsv, cleanCell, deleteRowFromTsv, shiftRowsAfterDelete, orderLeastPracticedFirst, matchesPracticedFilter, MistakeRowMismatchError } from '../lib/mistakes'
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
      { row: 1, mistake: 'ik ben eens met jou', correction: 'Ik ben het eens met jou.', type: 'Grammar fix', timesPracticed: 0, translation: '', rewording: '' },
      { row: 3, mistake: 'De mensen zou bestijden', correction: 'De mensen zouden bestrijden', type: 'Both', timesPracticed: 2, translation: '', rewording: '' },
    ])
  })

  it('finds the columns in any order and treats an empty count as 0', () => {
    const text = '﻿noOfTimesPracticed\tMogelijke verbetering\tMijn fout\r\n\tGoed.\tFout.\r\n'

    expect(parseMistakesTsv(text)).toEqual([{ row: 1, mistake: 'Fout.', correction: 'Goed.', type: '', timesPracticed: 0, translation: '', rewording: '' }])
  })

  it('reads the English translation when the file has that column', () => {
    const text = 'Mijn fout\tMogelijke verbetering\tType fout\tnoOfTimesPracticed\tenglishTranslation\nik ben eens\tIk ben het eens.\tGrammar fix\t0\tI agree.\n'

    expect(parseMistakesTsv(text)[0].translation).toBe('I agree.')
  })

  it('reads the herformulering column when the file has it', () => {
    const text = 'Mijn fout\tMogelijke verbetering\tnoOfTimesPracticed\therformulering\nik ben eens\tIk ben het eens.\t0\tDaar ben ik het mee eens.\n'

    expect(parseMistakesTsv(text)[0].rewording).toBe('Daar ben ik het mee eens.')
  })

  it('throws when a required column is missing', () => {
    expect(() => parseMistakesTsv('Mijn fout\tType fout\nx\ty')).toThrow(/Mogelijke verbetering, noOfTimesPracticed/)
  })
})

describe('updateMistakeInTsv', () => {
  it('changes only that row\'s count and keeps the rest of the file', () => {
    const updated = updateMistakeInTsv(TSV, 3, 'De mensen zou bestijden', { timesPracticed: 3 })

    expect(updated).toBe(TSV.replace('Both\t2', 'Both\t3'))
  })

  it('keeps Windows line endings and fills a missing count cell', () => {
    const text = 'Mijn fout\tMogelijke verbetering\tnoOfTimesPracticed\r\nFout.\tGoed.\r\n'

    expect(updateMistakeInTsv(text, 1, 'Fout.', { timesPracticed: 1 })).toBe('Mijn fout\tMogelijke verbetering\tnoOfTimesPracticed\r\nFout.\tGoed.\t1\r\n')
  })

  it('refuses when the row holds a different mistake, or does not exist', () => {
    expect(() => updateMistakeInTsv(TSV, 1, 'iets anders', { timesPracticed: 1 })).toThrow(MistakeRowMismatchError)
    expect(() => updateMistakeInTsv(TSV, 0, 'Mijn fout', { timesPracticed: 1 })).toThrow(MistakeRowMismatchError)
    expect(() => updateMistakeInTsv(TSV, 99, 'x', { timesPracticed: 1 })).toThrow(MistakeRowMismatchError)
  })
})

describe('updateMistakeInTsv correction', () => {
  it('changes only the correction cell, cleaned of tabs and line breaks', () => {
    const updated = updateMistakeInTsv(TSV, 1, 'ik ben eens met jou', { correction: ' Ik ben het met je\teens.\n' })

    expect(updated).toBe(TSV.replace('Ik ben het eens met jou.', 'Ik ben het met je eens.'))
  })
})

describe('cleanCell', () => {
  it('collapses all whitespace into single spaces', () => {
    expect(cleanCell('  a\tb\r\n c  ')).toBe('a b c')
  })
})

describe('deleteRowFromTsv', () => {
  it('removes only that line, so the rows below it move up', () => {
    const updated = deleteRowFromTsv(TSV, 1, 'ik ben eens met jou')

    expect(updated).toBe(TSV.replace('ik ben eens met jou\tIk ben het eens met jou.\tGrammar fix\t0\n', ''))
    expect(parseMistakesTsv(updated).map(m => [m.row, m.mistake])).toEqual([[2, 'De mensen zou bestijden']])
  })

  it('refuses when the row holds a different mistake', () => {
    expect(() => deleteRowFromTsv(TSV, 3, 'ik ben eens met jou')).toThrow(MistakeRowMismatchError)
  })
})

describe('shiftRowsAfterDelete', () => {
  it('drops the deleted row and moves the rows below it up one line', () => {
    expect(shiftRowsAfterDelete([{ row: 1 }, { row: 3 }, { row: 5 }], 3)).toEqual([{ row: 1 }, { row: 4 }])
  })
})

describe('matchesPracticedFilter', () => {
  it('matches an exact count, 3 or more, or everything', () => {
    const counts = [0, 1, 2, 3, 7]
    const matching = (filter: Parameters<typeof matchesPracticedFilter>[1]) =>
      counts.filter(timesPracticed => matchesPracticedFilter({ timesPracticed }, filter))

    expect(matching('0')).toEqual([0])
    expect(matching('2')).toEqual([2])
    expect(matching('3+')).toEqual([3, 7])
    expect(matching('alle')).toEqual(counts)
  })
})

describe('orderLeastPracticedFirst', () => {
  it('puts the least practiced mistakes first', () => {
    const make = (row: number, timesPracticed: number): Mistake => ({ row, mistake: `m${row}`, correction: '', type: '', timesPracticed, translation: '', rewording: '' })

    const ordered = orderLeastPracticedFirst([make(1, 3), make(2, 0), make(3, 1), make(4, 0)])

    expect(ordered.map(m => m.timesPracticed)).toEqual([0, 0, 1, 3])
    expect(ordered.slice(0, 2).map(m => m.row).sort()).toEqual([2, 4])
  })
})
