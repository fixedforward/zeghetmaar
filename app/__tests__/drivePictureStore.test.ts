import { describe, it, expect, vi, beforeEach } from 'vitest'

const { filesUpdateMock, listMock, config } = vi.hoisted(() => ({
  filesUpdateMock: vi.fn(),
  listMock: vi.fn(),
  config: { database: { googlePicturesFolder: { folderId: 'pics' } as { folderId: string } | undefined } },
}))

vi.mock('../lib/config', () => ({ config }))
vi.mock('../lib/driveStore', () => ({ getDriveClient: () => ({ files: { update: filesUpdateMock } }) }))
vi.mock('../lib/driveArticleStore', () => ({ listDriveFolderFilesAsync: listMock }))

import { deletePhrasePicturesAsync, picturesOnlyUsedBy } from '../lib/drivePictureStore'

const meaning = (translation: string) => ({ translation, examples: [] })
const fiets = { word: 'fiets', meanings: [meaning('bike'), meaning('bicycle')] }
const pictures = [
  { id: 'p1', name: 'fiets.png' },
  { id: 'p2', name: 'fiets$bicycle.png' },
  { id: 'p3', name: 'auto.png' },
  { id: 'p4', name: 'gekozen.png' },
]

describe('picturesOnlyUsedBy', () => {
  it('takes the picture of every meaning of the phrase', () => {
    expect(picturesOnlyUsedBy(pictures, fiets, [])).toEqual(['p1', 'p2'])
  })

  it('takes the picture chosen for the phrase instead of the one named after it', () => {
    expect(picturesOnlyUsedBy(pictures, { ...fiets, picture: 'p4' }, [])).toEqual(['p4', 'p2'])
  })

  it('keeps a picture that another phrase still shows', () => {
    const other = { word: 'rijwiel', meanings: [meaning('bike')], picture: 'p1' }

    expect(picturesOnlyUsedBy(pictures, fiets, [other])).toEqual(['p2'])
  })

  it('takes nothing for a phrase without pictures', () => {
    expect(picturesOnlyUsedBy(pictures, { word: 'fiets', meanings: [] }, [])).toEqual([])
  })
})

describe('deletePhrasePicturesAsync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    config.database.googlePicturesFolder = { folderId: 'pics' }
    listMock.mockResolvedValue(pictures.map(p => ({ ...p, mimeType: 'image/png' })))
    filesUpdateMock.mockResolvedValue({})
  })

  it('trashes the pictures of the phrase', async () => {
    await deletePhrasePicturesAsync(fiets, [])

    expect(listMock).toHaveBeenCalledWith('pics')
    expect(filesUpdateMock).toHaveBeenCalledWith({ fileId: 'p1', requestBody: { trashed: true }, supportsAllDrives: true })
    expect(filesUpdateMock).toHaveBeenCalledWith({ fileId: 'p2', requestBody: { trashed: true }, supportsAllDrives: true })
    expect(filesUpdateMock).toHaveBeenCalledTimes(2)
  })

  it('takes a picture out of the folder when it may not trash it', async () => {
    filesUpdateMock.mockImplementation(({ requestBody }: { requestBody?: unknown }) =>
      requestBody ? Promise.reject(new Error('insufficientFilePermissions')) : Promise.resolve({}))

    await deletePhrasePicturesAsync({ word: 'fiets', meanings: [meaning('bike')] }, [])

    expect(filesUpdateMock).toHaveBeenLastCalledWith({ fileId: 'p1', removeParents: 'pics', supportsAllDrives: true })
  })

  it('logs a picture it cannot remove and still removes the others', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    filesUpdateMock.mockImplementation(({ fileId }: { fileId: string }) =>
      fileId === 'p1' ? Promise.reject(new Error('nope')) : Promise.resolve({}))

    await deletePhrasePicturesAsync(fiets, [])

    expect(filesUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ fileId: 'p2', requestBody: { trashed: true } }))
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('p1'), expect.any(Error))
  })

  it('does nothing when the pictures folder is not configured', async () => {
    config.database.googlePicturesFolder = undefined

    await deletePhrasePicturesAsync(fiets, [])

    expect(listMock).not.toHaveBeenCalled()
  })
})
