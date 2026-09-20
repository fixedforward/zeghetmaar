import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({ writeFileSync: vi.fn(), default: { writeFileSync: vi.fn() } }))

vi.mock('stream', () => ({ Readable: { from: vi.fn((arr: unknown[]) => arr) }, default: { Readable: { from: vi.fn((arr: unknown[]) => arr) } } }))

vi.mock('../lib/config', () => ({
  config: {
    database: {
      googleJsonFile: {
        googleDriveFileId: 'file123',
        serviceAccount: {},
      },
    },
  },
}))

const filesGetMock = vi.fn()
const filesUpdateMock = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn() },
    drive: () => ({ files: { get: filesGetMock, update: filesUpdateMock } }),
  },
}))

import { renameTag, deleteTag, getPracticedDatesAsync, markPracticedDateAsync, unmarkPracticedDateAsync } from '../lib/driveStore'
import { encodeYearBitmap } from '../lib/practiceLog'
import type { Phrase } from '../types'

function mockStoredPhrases(docs: Partial<Phrase>[]) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify(docs) })
}

function writtenPhrases(): Phrase[] {
  const body = filesUpdateMock.mock.calls[0][0].media.body[0] as string
  return JSON.parse(body)
}

const base = { normalizedWord: '', translation: '', examples: [], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }

describe('renameTag', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('renames the tag on every phrase that has it, case-insensitively', async () => {
    mockStoredPhrases([
      { ...base, id: '1', word: 'a', tags: ['Werk', 'reizen'] },
      { ...base, id: '2', word: 'b', tags: ['werk'] },
      { ...base, id: '3', word: 'c', tags: ['reizen'] },
    ])

    const count = await renameTag('werk', 'kantoor')

    expect(count).toBe(2)
    const written = writtenPhrases()
    expect(written.find(d => d.id === '1')?.tags).toEqual(['reizen', 'kantoor'])
    expect(written.find(d => d.id === '2')?.tags).toEqual(['kantoor'])
    expect(written.find(d => d.id === '3')?.tags).toEqual(['reizen'])
  })

  it('merges into an existing tag instead of duplicating it', async () => {
    mockStoredPhrases([{ ...base, id: '1', word: 'a', tags: ['werk', 'kantoor'] }])

    await renameTag('werk', 'kantoor')

    expect(writtenPhrases()[0].tags).toEqual(['kantoor'])
  })

  it('does not write when no phrase has the tag', async () => {
    mockStoredPhrases([{ ...base, id: '1', word: 'a', tags: ['reizen'] }])

    const count = await renameTag('werk', 'kantoor')

    expect(count).toBe(0)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })
})

describe('deleteTag', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('removes the tag from every phrase that has it', async () => {
    mockStoredPhrases([
      { ...base, id: '1', word: 'a', tags: ['werk', 'reizen'] },
      { ...base, id: '2', word: 'b', tags: ['reizen'] },
    ])

    const count = await deleteTag('werk')

    expect(count).toBe(1)
    const written = writtenPhrases()
    expect(written.find(d => d.id === '1')?.tags).toEqual(['reizen'])
    expect(written.find(d => d.id === '2')?.tags).toEqual(['reizen'])
  })

  it('drops the tags field entirely once the last tag is removed', async () => {
    mockStoredPhrases([{ ...base, id: '1', word: 'a', tags: ['werk'] }])

    await deleteTag('werk')

    expect(writtenPhrases()[0].tags).toBeUndefined()
  })
})

describe('getPracticedDatesAsync / markPracticedDateAsync', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('returns an empty list when there is no practice log yet', async () => {
    filesGetMock.mockResolvedValue({ data: { appProperties: undefined } })

    expect(await getPracticedDatesAsync('oefensessie')).toEqual([])
  })

  it('decodes dates from the per-year bitmap appProperties, sorted', async () => {
    filesGetMock.mockResolvedValue({
      data: {
        appProperties: {
          practice_oefensessie_2026: encodeYearBitmap([0, 261]), // 2026-01-01, 2026-09-19
          unrelated_key: 'ignored',
        },
      },
    })

    expect(await getPracticedDatesAsync('oefensessie')).toEqual(['2026-01-01', '2026-09-19'])
  })

  it('keeps oefensessie and quiz logs independent', async () => {
    filesGetMock.mockResolvedValue({
      data: {
        appProperties: {
          practice_oefensessie_2026: encodeYearBitmap([0]), // 2026-01-01
          practice_quiz_2026: encodeYearBitmap([261]), // 2026-09-19
        },
      },
    })

    expect(await getPracticedDatesAsync('oefensessie')).toEqual(['2026-01-01'])
    expect(await getPracticedDatesAsync('quiz')).toEqual(['2026-09-19'])
  })

  it('adds a new date to the year bitmap and writes only that property', async () => {
    filesGetMock
      .mockResolvedValueOnce({ data: { appProperties: {} } }) // read before write
      .mockResolvedValueOnce({ data: { appProperties: { practice_quiz_2026: encodeYearBitmap([261]) } } }) // read after write, for the return value

    const dates = await markPracticedDateAsync('quiz', '2026-09-19')

    expect(filesUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file123',
        requestBody: { appProperties: { practice_quiz_2026: encodeYearBitmap([261]) } },
      })
    )
    expect(dates).toEqual(['2026-09-19'])
  })

  it('does not write again when the date is already marked', async () => {
    filesGetMock.mockResolvedValue({ data: { appProperties: { practice_quiz_2026: encodeYearBitmap([261]) } } })

    const dates = await markPracticedDateAsync('quiz', '2026-09-19')

    expect(filesUpdateMock).not.toHaveBeenCalled()
    expect(dates).toEqual(['2026-09-19'])
  })

  it('rejects a malformed date', async () => {
    await expect(markPracticedDateAsync('quiz', '19-09-2026')).rejects.toThrow()
  })
})

describe('unmarkPracticedDateAsync', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('clears a day from the year bitmap, leaving other days intact', async () => {
    filesGetMock
      .mockResolvedValueOnce({ data: { appProperties: { practice_quiz_2026: encodeYearBitmap([0, 261]) } } }) // read before write
      .mockResolvedValueOnce({ data: { appProperties: { practice_quiz_2026: encodeYearBitmap([0]) } } }) // read after write

    const dates = await unmarkPracticedDateAsync('quiz', '2026-09-19')

    expect(filesUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file123',
        requestBody: { appProperties: { practice_quiz_2026: encodeYearBitmap([0]) } },
      })
    )
    expect(dates).toEqual(['2026-01-01'])
  })

  it('does not write when the date is not marked', async () => {
    filesGetMock.mockResolvedValue({ data: { appProperties: { practice_quiz_2026: encodeYearBitmap([0]) } } })

    await unmarkPracticedDateAsync('quiz', '2026-09-19')

    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('does not write when there is no log for that year at all', async () => {
    filesGetMock.mockResolvedValue({ data: { appProperties: {} } })

    const dates = await unmarkPracticedDateAsync('quiz', '2026-09-19')

    expect(filesUpdateMock).not.toHaveBeenCalled()
    expect(dates).toEqual([])
  })

  it('rejects a malformed date', async () => {
    await expect(unmarkPracticedDateAsync('quiz', '19-09-2026')).rejects.toThrow()
  })
})
