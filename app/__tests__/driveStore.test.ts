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

import { renameTag, deleteTag, getPracticedDatesAsync, markPracticedDateAsync, unmarkPracticedDateAsync, getAllWords, normalizeMeanings, getMarkedFileIdsAsync, setFileMarkedAsync, getListeningLinksAsync, addListeningLinkAsync, deleteListeningLinkAsync } from '../lib/driveStore'
import { encodeYearBitmap } from '../lib/practiceLog'
import type { Phrase } from '../types'

// Legacy on-disk shape was just the phrases array; the current shape is
// { phrases, preparedQuizFileIds, readArticleIds }. mockStoredPhrases keeps testing the
// legacy array shape (backward compat), writtenPhrases reads the current one.
function mockStoredPhrases(docs: Partial<Phrase>[]) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify(docs) })
}

function mockStoredRoot(docs: Partial<Phrase>[], preparedQuizFileIds: string[] = [], readArticleIds: string[] = []) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: docs, preparedQuizFileIds, readArticleIds }) })
}

function writtenPhrases(): Phrase[] {
  const body = filesUpdateMock.mock.calls[0][0].media.body[0] as string
  return JSON.parse(body).phrases
}

function writtenRoot(): { preparedQuizFileIds: string[]; readArticleIds: string[]; listeningLinks: unknown[] } {
  const body = filesUpdateMock.mock.calls[0][0].media.body[0] as string
  return JSON.parse(body)
}

function writtenPreparedQuizFileIds(): string[] {
  return writtenRoot().preparedQuizFileIds
}

const base = { normalizedWord: '', meanings: [{ translation: '', examples: [] }], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }

describe('getAllWords — meanings migration', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
  })

  it('wraps a legacy single translation/examples pair into a one-item meanings array', async () => {
    // Legacy on-disk shape predates `meanings` — cast past the current type.
    mockStoredPhrases([{
      id: '1', word: 'gezellig', normalizedWord: 'gezellig',
      translation: 'cozy', examples: ['Wat een gezellige avond.'],
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    } as unknown as Partial<Phrase>])

    const [doc] = await getAllWords()

    expect(doc.meanings).toEqual([{ translation: 'cozy', examples: ['Wat een gezellige avond.'] }])
  })

  it('leaves a doc already shaped with meanings unchanged', async () => {
    const meanings = [
      { translation: 'to assign', examples: ['Ik ken taken toe.'] },
      { translation: 'to award', examples: [] },
    ]
    mockStoredPhrases([{
      id: '1', word: 'toekennen', normalizedWord: 'toekennen', meanings,
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    }])

    const [doc] = await getAllWords()

    expect(doc.meanings).toEqual(meanings)
  })

  it('defaults to one empty meaning when there is no legacy translation either', async () => {
    mockStoredPhrases([{
      id: '1', word: 'x', normalizedWord: 'x',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    }])

    const [doc] = await getAllWords()

    expect(doc.meanings).toEqual([{ translation: '', examples: [] }])
  })
})

describe('root document shape (phrases + marked file ids)', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('reads phrases from a legacy array-shaped root, defaulting preparedQuizFileIds to empty', async () => {
    mockStoredPhrases([{ ...base, id: '1', word: 'a' }])

    const words = await getAllWords()
    const prepared = await getMarkedFileIdsAsync('quiz')

    expect(words).toHaveLength(1)
    expect(prepared).toEqual([])
  })

  it('reads phrases and preparedQuizFileIds from the current object-shaped root', async () => {
    mockStoredRoot([{ ...base, id: '1', word: 'a' }], ['fileA', 'fileB'])

    const words = await getAllWords()
    const prepared = await getMarkedFileIdsAsync('quiz')

    expect(words).toHaveLength(1)
    expect(prepared).toEqual(['fileA', 'fileB'])
  })

  it('setFileMarkedAsync adds a file id without touching phrases', async () => {
    mockStoredRoot([{ ...base, id: '1', word: 'a' }], ['fileA'])

    const result = await setFileMarkedAsync('quiz', 'fileB', true)

    expect(result).toEqual(['fileA', 'fileB'])
    expect(writtenPreparedQuizFileIds()).toEqual(['fileA', 'fileB'])
    expect(writtenPhrases()).toHaveLength(1)
  })

  it('setFileMarkedAsync removes a file id', async () => {
    mockStoredRoot([], ['fileA', 'fileB'])

    const result = await setFileMarkedAsync('quiz', 'fileA', false)

    expect(result).toEqual(['fileB'])
    expect(writtenPreparedQuizFileIds()).toEqual(['fileB'])
  })

  it('setFileMarkedAsync is idempotent when marking an already-prepared id', async () => {
    mockStoredRoot([], ['fileA'])

    const result = await setFileMarkedAsync('quiz', 'fileA', true)

    expect(result).toEqual(['fileA'])
  })

  it('setFileMarkedAsync for articles writes readArticleIds and leaves quiz ids alone', async () => {
    mockStoredRoot([], ['fileA'], ['art1'])

    const result = await setFileMarkedAsync('articles', 'art2', true)

    expect(result).toEqual(['art1', 'art2'])
    expect(writtenRoot()).toMatchObject({ preparedQuizFileIds: ['fileA'], readArticleIds: ['art1', 'art2'] })
  })

  it('getMarkedFileIdsAsync reads readArticleIds, defaulting to empty on a root without them', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], preparedQuizFileIds: ['fileA'] }) })

    expect(await getMarkedFileIdsAsync('articles')).toEqual([])
  })

  it('a phrase write (insertWord via renameTag path) preserves the marked file ids', async () => {
    mockStoredRoot([{ ...base, id: '1', word: 'a', tags: ['werk'] }], ['fileA'], ['art1'])

    await renameTag('werk', 'kantoor')

    expect(writtenRoot()).toMatchObject({ preparedQuizFileIds: ['fileA'], readArticleIds: ['art1'] })
    expect(writtenPhrases()[0].tags).toEqual(['kantoor'])
  })
})

describe('listening links', () => {
  const link = { id: 'l1', title: 'Journaal', url: 'https://youtu.be/a', createdAt: '2024-01-01T00:00:00.000Z' }

  beforeEach(() => {
    filesGetMock.mockReset()
    filesUpdateMock.mockReset()
    filesUpdateMock.mockResolvedValue({})
  })

  it('defaults to an empty list on a root without listeningLinks', async () => {
    mockStoredRoot([])

    expect(await getListeningLinksAsync()).toEqual([])
  })

  it('drops malformed entries when reading', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], listeningLinks: [link, { id: 'x' }, null] }) })

    expect(await getListeningLinksAsync()).toEqual([link])
  })

  it('addListeningLinkAsync puts the new link first and keeps phrases and marked ids', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [{ ...base, id: '1', word: 'a' }], preparedQuizFileIds: ['fileA'], readArticleIds: [], listeningLinks: [link] }) })

    const result = await addListeningLinkAsync('Podcast', 'https://www.youtube.com/watch?v=b')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ title: 'Podcast', url: 'https://www.youtube.com/watch?v=b' })
    expect(result[1]).toEqual(link)
    expect(writtenRoot()).toMatchObject({ preparedQuizFileIds: ['fileA'], listeningLinks: result })
    expect(writtenPhrases()).toHaveLength(1)
  })

  it('deleteListeningLinkAsync removes the link by id', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], listeningLinks: [link] }) })

    expect(await deleteListeningLinkAsync('l1')).toEqual([])
    expect(writtenRoot().listeningLinks).toEqual([])
  })

  it('deleteListeningLinkAsync does not write when the id is unknown', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], listeningLinks: [link] }) })

    expect(await deleteListeningLinkAsync('nope')).toEqual([link])
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('a phrase write preserves the listening links', async () => {
    filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [{ ...base, id: '1', word: 'a', tags: ['werk'] }], listeningLinks: [link] }) })

    await renameTag('werk', 'kantoor')

    expect(writtenRoot().listeningLinks).toEqual([link])
  })
})

describe('normalizeMeanings', () => {
  it('rejects a non-array or empty array', () => {
    expect(normalizeMeanings(undefined)).toBeNull()
    expect(normalizeMeanings('not an array')).toBeNull()
    expect(normalizeMeanings([])).toBeNull()
  })

  it('rejects a meaning with a blank translation', () => {
    expect(normalizeMeanings([{ translation: '  ', examples: [] }])).toBeNull()
    expect(normalizeMeanings([{ examples: [] }])).toBeNull()
  })

  it('trims translations and dedupes/trims/drops-blank examples', () => {
    const result = normalizeMeanings([
      { translation: '  cozy  ', examples: [' a ', 'a', '', '  '] },
    ])
    expect(result).toEqual([{ translation: 'cozy', examples: ['a'] }])
  })

  it('accepts multiple meanings', () => {
    const result = normalizeMeanings([
      { translation: 'to assign', examples: [] },
      { translation: 'to award', examples: ['We awarded the prize.'] },
    ])
    expect(result).toEqual([
      { translation: 'to assign', examples: [] },
      { translation: 'to award', examples: ['We awarded the prize.'] },
    ])
  })
})

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
