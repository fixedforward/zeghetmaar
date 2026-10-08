// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'
import { NextRequest } from 'next/server'

const { authMock, filesListMock, filesGetMock, config } = vi.hoisted(() => ({
  authMock: vi.fn(),
  filesListMock: vi.fn(),
  filesGetMock: vi.fn(),
  config: { database: {} as { googleListeningFolder?: { folderId: string } } },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/config', () => ({ config }))
vi.mock('@/app/lib/driveStore', () => ({
  getDriveClient: () => ({ files: { list: filesListMock, get: filesGetMock } }),
}))

import { GET as getMedia } from '../api/luisteren/media/[id]/route'
import { GET as getLesson } from '../api/luisteren/lessons/[folderId]/route'
import { GET as getTree } from '../api/luisteren/tree/route'

const mediaRequest = (id: string, range?: string) =>
  getMedia(
    new NextRequest(`http://localhost/api/luisteren/media/${id}`, { headers: range ? { range } : {} }),
    { params: Promise.resolve({ id }) },
  )

const lessonRequest = (folderId: string, fileId?: string) =>
  getLesson(
    new NextRequest(`http://localhost/api/luisteren/lessons/${folderId}${fileId ? `?file=${fileId}` : ''}`),
    { params: Promise.resolve({ folderId }) },
  )

describe('GET /api/luisteren/media/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    const res = await mediaRequest('v1')

    expect(res.status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid file id', async () => {
    const res = await mediaRequest('bad id!')

    expect(res.status).toBe(400)
  })

  it('streams the requested byte range from Drive as 206 Partial Content', async () => {
    filesGetMock.mockResolvedValue({
      status: 206,
      headers: { 'content-type': 'video/mp4', 'content-length': '4', 'content-range': 'bytes 100-103/5000', 'content-disposition': 'attachment' },
      data: Readable.from([Buffer.from('abcd')]),
    })

    const res = await mediaRequest('v1', 'bytes=100-103')

    expect(filesGetMock).toHaveBeenCalledWith(
      { fileId: 'v1', alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: { Range: 'bytes=100-103' } },
    )
    expect(res.status).toBe(206)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-length')).toBe('4')
    expect(res.headers.get('content-range')).toBe('bytes 100-103/5000')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('content-disposition')).toBeNull()
    expect(await res.text()).toBe('abcd')
  })

  it('refuses files that are not video or audio', async () => {
    const stream = Readable.from([Buffer.from('secret')])
    filesGetMock.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json' }, data: stream })

    const res = await mediaRequest('doc1')

    expect(res.status).toBe(415)
    expect(stream.destroyed).toBe(true)
  })

  it('passes on Drive’s 416 for a range past the end of the file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    filesGetMock.mockRejectedValue(Object.assign(new Error('Range Not Satisfiable'), { response: { status: 416 } }))

    const res = await mediaRequest('v1', 'bytes=999999-')

    expect(res.status).toBe(416)
  })
})

describe('GET /api/luisteren/lessons/[folderId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await lessonRequest('f1', 'v1')).status).toBe(401)
  })

  it('needs a valid file id', async () => {
    expect((await lessonRequest('f1')).status).toBe(400)
    expect((await lessonRequest('f1', 'bad!id')).status).toBe(400)
  })

  it('returns the media file and the transcript from the .srt of the same name', async () => {
    filesListMock.mockResolvedValue({ data: { files: [
      { id: 'v1', name: 'Les 14.mp4', mimeType: 'video/mp4' },
      { id: 's1', name: 'Les 14.srt', mimeType: 'application/x-subrip' },
    ] } })
    filesGetMock.mockImplementation(({ fields }: { fields?: string }) =>
      Promise.resolve({ data: fields === 'mimeType' ? { mimeType: 'application/x-subrip' } : '1\n00:00:01,000 --> 00:00:02,500\nHallo daar.' })
    )

    const res = await lessonRequest('f1', 'v1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      id: 'f1',
      name: 'Les 14',
      mediaFileId: 'v1',
      subtitleFileName: 'Les 14.srt',
      subtitleFileId: 's1',
      cues: [{ start: 1, end: 2.5, text: 'Hallo daar.' }],
    })
  })

  it('still returns the lesson, without cues, when the .srt with the same name is missing', async () => {
    filesListMock.mockResolvedValue({ data: { files: [
      { id: 'v1', name: 'Les 14.mp4', mimeType: 'video/mp4' },
      { id: 's1', name: 'generated.nl.srt', mimeType: 'application/x-subrip' },
    ] } })

    const res = await lessonRequest('f1', 'v1')

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ subtitleFileName: 'Les 14.srt', subtitleFileId: null, cues: [] })
  })

  it('returns 404 when the file is not in the folder', async () => {
    filesListMock.mockResolvedValue({ data: { files: [{ id: 'v1', name: 'Les 14.mp4', mimeType: 'video/mp4' }] } })

    expect((await lessonRequest('f1', 'v2')).status).toBe(404)
  })
})

describe('GET /api/luisteren/tree', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    config.database = { googleListeningFolder: { folderId: 'root1' } }
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await getTree()).status).toBe(401)
  })

  it('says so when no listening folder is configured', async () => {
    config.database = {}

    expect((await getTree()).status).toBe(501)
  })

  it('returns the tree of the configured folder', async () => {
    filesListMock.mockImplementation(({ q }: { q: string }) => Promise.resolve({ data: { files: q.startsWith("'root1'")
      ? [{ id: 'f1', name: 'Les 14', mimeType: 'application/vnd.google-apps.folder' }]
      : [{ id: 'v1', name: 'Les 14.mp4', mimeType: 'video/mp4' }] } }))

    const res = await getTree()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      id: 'root1', name: '', files: [],
      folders: [{ id: 'f1', name: 'Les 14', folders: [], files: [{ id: 'v1', name: 'Les 14.mp4', hasSubtitles: false }] }],
    })
  })
})
