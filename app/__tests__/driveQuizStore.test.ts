import { describe, it, expect, vi, beforeEach } from 'vitest'

const filesListMock = vi.fn()
const filesUpdateMock = vi.fn()
const filesGetMock = vi.fn()

vi.mock('../lib/driveStore', () => ({
  getDriveClient: () => ({ files: { list: filesListMock, update: filesUpdateMock, get: filesGetMock } }),
}))

vi.mock('../lib/config', () => ({
  config: { database: { googleQuizFolder: { folderId: 'folder123' } } },
}))

import { parseQuizFile, listQuizFilesAsync, QUIZ_FILES_PAGE_SIZE } from '../lib/driveQuizStore'

describe('parseQuizFile', () => {
  it('pairs a Dutch list with a matching English list by sentence number', () => {
    const text = [
      '1. Een zin in het Nederlands.\\',
      '2. Nog een zin.',
      '',
      '1. A sentence in Dutch.',
      '2. Another sentence.',
    ].join('\n')

    expect(parseQuizFile(text)).toEqual([
      { dutch: 'Een zin in het Nederlands.', english: 'A sentence in Dutch.' },
      { dutch: 'Nog een zin.', english: 'Another sentence.' },
    ])
  })

  it('ignores blank lines and non-numbered lines', () => {
    const text = '1. Hallo.\n\nRandom note\n1. Hello.\n'
    expect(parseQuizFile(text)).toEqual([{ dutch: 'Hallo.', english: 'Hello.' }])
  })

  it('throws when the two lists have different lengths', () => {
    const text = '1. Een.\n2. Twee.\n1. One.'
    expect(() => parseQuizFile(text)).toThrow()
  })

  it('throws when there is only one numbered list', () => {
    const text = '1. Een.\n2. Twee.'
    expect(() => parseQuizFile(text)).toThrow()
  })
})

describe('listQuizFilesAsync', () => {
  beforeEach(() => {
    filesListMock.mockReset()
    filesGetMock.mockReset()
    filesGetMock.mockResolvedValue({ data: { name: 'Cloze-oefeningen' } })
  })

  it('sorts by name descending and filters out non-.txt files', async () => {
    filesListMock.mockResolvedValue({
      data: {
        files: [
          { id: '1', name: 'les1.txt' },
          { id: '2', name: 'notes.pdf' },
          { id: '3', name: 'les2.TXT' },
        ],
      },
    })

    const page = await listQuizFilesAsync()

    expect(filesListMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: 'name desc', pageSize: QUIZ_FILES_PAGE_SIZE, pageToken: undefined })
    )
    expect(page.files).toEqual([
      { id: '1', name: 'les1.txt' },
      { id: '3', name: 'les2.TXT' },
    ])
    expect(page.nextPageToken).toBeUndefined()
  })

  it('passes pageToken and pageSize through to the Drive request and returns nextPageToken', async () => {
    filesListMock.mockResolvedValue({
      data: { files: [{ id: '4', name: 'les3.txt' }], nextPageToken: 'tok2' },
    })

    const page = await listQuizFilesAsync('tok1', 5)

    expect(filesListMock).toHaveBeenCalledWith(
      expect.objectContaining({ pageToken: 'tok1', pageSize: 5 })
    )
    expect(page.nextPageToken).toBe('tok2')
  })

  it('includes the configured folder\'s real name, fetched alongside the file list', async () => {
    filesListMock.mockResolvedValue({ data: { files: [] } })

    const page = await listQuizFilesAsync()

    expect(filesGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'folder123', fields: 'name' })
    )
    expect(page.folderName).toBe('Cloze-oefeningen')
  })

  it('omits folderName instead of throwing when the folder lookup fails', async () => {
    filesListMock.mockResolvedValue({ data: { files: [] } })
    filesGetMock.mockRejectedValue(new Error('not found'))

    const page = await listQuizFilesAsync()

    expect(page.folderName).toBeUndefined()
  })
})
