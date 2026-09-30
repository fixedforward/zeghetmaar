import { describe, it, expect } from 'vitest'
import { groupQuizFilesByDate } from '../lib/quizFiles'
import type { QuizFile } from '../types'

describe('groupQuizFilesByDate', () => {
  it('groups adjacent same-date files together, preserving order', () => {
    const files: QuizFile[] = [
      { id: '1', name: 'Cloze-oefening 2026-09-19 23.05.txt' },
      { id: '2', name: 'Cloze-oefening 2026-09-19 11.00.txt' },
      { id: '3', name: 'Cloze-oefening 2026-09-18 23.04.txt' },
    ]

    const groups = groupQuizFilesByDate(files)

    expect(groups).toEqual([
      { date: '2026-09-19', files: [files[0], files[1]] },
      { date: '2026-09-18', files: [files[2]] },
    ])
  })

  it('puts files with no date in the filename into a null-date group', () => {
    const files: QuizFile[] = [{ id: '1', name: 'les1.txt' }]
    expect(groupQuizFilesByDate(files)).toEqual([{ date: null, files }])
  })

  it('creates a new group when the same date reappears non-adjacently', () => {
    const files: QuizFile[] = [
      { id: '1', name: 'a 2026-09-19.txt' },
      { id: '2', name: 'b 2026-09-18.txt' },
      { id: '3', name: 'c 2026-09-19.txt' },
    ]

    const groups = groupQuizFilesByDate(files)

    expect(groups).toEqual([
      { date: '2026-09-19', files: [files[0]] },
      { date: '2026-09-18', files: [files[1]] },
      { date: '2026-09-19', files: [files[2]] },
    ])
  })

  it('returns an empty array for an empty file list', () => {
    expect(groupQuizFilesByDate([])).toEqual([])
  })
})
