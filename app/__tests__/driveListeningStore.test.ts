import { describe, it, expect, vi, beforeEach } from 'vitest'

const filesListMock = vi.fn()
const filesGetMock = vi.fn()

vi.mock('../lib/driveStore', () => ({
  getDriveClient: () => ({ files: { list: filesListMock, get: filesGetMock } }),
}))

vi.mock('../lib/config', () => ({ config: { database: { googleListeningFolder: { folderId: 'root1' } } } }))

import {
  getListeningLessonAsync, getListeningTreeAsync, getListeningRootFolderId, getDriveMediaAsync,
  isMediaMimeType, isPlayableFileName, subtitleFileName,
} from '../lib/driveListeningStore'

const FOLDER = 'application/vnd.google-apps.folder'
const file = (id: string, name: string, mimeType = 'application/octet-stream') => ({ id, name, mimeType })

// files.list answers per folder id; files.get serves the .srt text.
function mockDrive(folders: Record<string, ReturnType<typeof file>[]>, srtText = '1\n00:00:01,000 --> 00:00:02,000\nHallo.') {
  filesListMock.mockImplementation(({ q }: { q: string }) => {
    const folderId = q.match(/^'([^']+)'/)![1]
    return Promise.resolve({ data: { files: folders[folderId] ?? [] } })
  })
  filesGetMock.mockImplementation(({ fields }: { fields?: string }) =>
    Promise.resolve({ data: fields === 'mimeType' ? { mimeType: 'application/x-subrip' } : srtText })
  )
}

describe('file name helpers', () => {
  it('accepts video and audio mime types only', () => {
    expect(isMediaMimeType('video/mp4')).toBe(true)
    expect(isMediaMimeType('audio/mpeg')).toBe(true)
    expect(isMediaMimeType('application/x-subrip')).toBe(false)
    expect(isMediaMimeType(undefined)).toBe(false)
  })

  it('plays .mp3 and .mp4 files only', () => {
    expect(isPlayableFileName('Les 14.mp4')).toBe(true)
    expect(isPlayableFileName('podcast.MP3')).toBe(true)
    expect(isPlayableFileName('Les 14.srt')).toBe(false)
    expect(isPlayableFileName('clip.webm')).toBe(false)
  })

  it('expects the .srt to have the same name as the media file', () => {
    expect(subtitleFileName('Les 14 (deel 2).mp4')).toBe('Les 14 (deel 2).srt')
  })

  it('reads the configured root folder', () => {
    expect(getListeningRootFolderId()).toBe('root1')
  })
})

describe('getListeningTreeAsync', () => {
  beforeEach(() => vi.resetAllMocks())

  it('keeps only mp3/mp4 files and the folders that hold one, sorted by name', async () => {
    mockDrive({
      root1: [file('d1', 'Notities', 'application/vnd.google-apps.document'), file('fB', 'Podcasts', FOLDER), file('fA', 'Les 14', FOLDER), file('fE', 'Leeg', FOLDER)],
      fA: [file('v1', 'Les 14.mp4', 'video/mp4'), file('s1', 'Les 14.srt'), file('x1', 'Les 14.webm', 'video/webm')],
      fB: [file('a2', 'b.mp3', 'audio/mpeg'), file('a1', 'a.mp3', 'audio/mpeg'), file('s9', 'iets anders.srt')],
      fE: [file('t1', 'leesmij.txt', 'text/plain')],
    })

    const tree = await getListeningTreeAsync('root1')

    expect(tree).toEqual({
      id: 'root1',
      name: '',
      files: [],
      folders: [
        { id: 'fA', name: 'Les 14', folders: [], files: [{ id: 'v1', name: 'Les 14.mp4', hasSubtitles: true }] },
        {
          id: 'fB', name: 'Podcasts', folders: [],
          files: [{ id: 'a1', name: 'a.mp3', hasSubtitles: false }, { id: 'a2', name: 'b.mp3', hasSubtitles: false }],
        },
      ],
    })
  })

  it('walks nested folders', async () => {
    mockDrive({
      root1: [file('f1', 'NL', FOLDER)],
      f1: [file('f2', 'vids', FOLDER)],
      f2: [file('v1', 'Les.mp4', 'video/mp4')],
    })

    const tree = await getListeningTreeAsync('root1')

    expect(tree.folders[0].folders[0].files).toEqual([{ id: 'v1', name: 'Les.mp4', hasSubtitles: false }])
  })
})

describe('getListeningLessonAsync', () => {
  beforeEach(() => vi.resetAllMocks())

  it('loads the media file with the .srt of the same name', async () => {
    mockDrive({
      f1: [file('s0', 'generated_les.srt'), file('s1', 'Les 14.srt'), file('v1', 'Les 14.mp4', 'video/mp4')],
    })

    const lesson = await getListeningLessonAsync('f1', 'v1')

    expect(filesGetMock).toHaveBeenCalledWith({ fileId: 's1', alt: 'media', supportsAllDrives: true }, { responseType: 'text' })
    expect(lesson).toEqual({
      id: 'f1',
      name: 'Les 14',
      mediaFileId: 'v1',
      isAudio: false,
      subtitleFileName: 'Les 14.srt',
      subtitleFileId: 's1',
      cues: [{ start: 1, end: 2, text: 'Hallo.' }],
    })
  })

  it('marks an mp3 as audio', async () => {
    mockDrive({ f1: [file('a1', 'podcast.mp3', 'audio/mpeg')] })

    expect(await getListeningLessonAsync('f1', 'a1')).toMatchObject({ isAudio: true })
  })

  it('says the subtitles are missing when no .srt has the same name', async () => {
    mockDrive({ f1: [file('v1', 'Les 14.mp4', 'video/mp4'), file('s0', 'generated_les_14.srt')] })

    const lesson = await getListeningLessonAsync('f1', 'v1')

    expect(lesson).toMatchObject({ subtitleFileName: 'Les 14.srt', subtitleFileId: null, cues: [] })
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('returns null when the file is not a playable file in that folder', async () => {
    mockDrive({ f1: [file('v1', 'Les 14.mp4', 'video/mp4'), file('s1', 'Les 14.srt')] })

    expect(await getListeningLessonAsync('f1', 'other')).toBeNull()
    expect(await getListeningLessonAsync('f1', 's1')).toBeNull()
  })
})

describe('getDriveMediaAsync', () => {
  beforeEach(() => vi.resetAllMocks())

  it('streams the file and passes the Range header on', async () => {
    filesGetMock.mockResolvedValue({ status: 206, headers: { 'content-type': 'video/mp4' }, data: 'stream' })

    const media = await getDriveMediaAsync('v1', 'bytes=100-')

    expect(filesGetMock).toHaveBeenCalledWith(
      { fileId: 'v1', alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: { Range: 'bytes=100-' } },
    )
    expect(media).toEqual({ status: 206, headers: { 'content-type': 'video/mp4' }, stream: 'stream' })
  })

  it('sends no Range header when the browser sent none', async () => {
    filesGetMock.mockResolvedValue({ status: 200, headers: {}, data: 'stream' })

    await getDriveMediaAsync('v1', null)

    expect(filesGetMock).toHaveBeenCalledWith(expect.anything(), { responseType: 'stream', headers: {} })
  })
})
