// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'
import { NextRequest } from 'next/server'

const { authMock, filesListMock, filesGetMock, config } = vi.hoisted(() => ({
  authMock: vi.fn(),
  filesListMock: vi.fn(),
  filesGetMock: vi.fn(),
  config: { database: {} as { googlePicturesFolder?: { folderId: string } } },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/config', () => ({ config }))
vi.mock('@/app/lib/driveStore', () => ({
  getDriveClient: () => ({ files: { list: filesListMock, get: filesGetMock } }),
}))

import { GET as listPictures } from '../api/pictures/route'
import { GET as getPicture } from '../api/pictures/[id]/route'

const pictureRequest = (id: string) =>
  getPicture(new NextRequest(`http://localhost/api/pictures/${id}`), { params: Promise.resolve({ id }) })

describe('GET /api/pictures', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    config.database = { googlePicturesFolder: { folderId: 'pics' } }
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await listPictures()).status).toBe(401)
    expect(filesListMock).not.toHaveBeenCalled()
  })

  it('returns 501 when the folder is not configured', async () => {
    config.database = {}

    expect((await listPictures()).status).toBe(501)
  })

  it('lists only images, sorted by name', async () => {
    filesListMock.mockResolvedValue({ data: { files: [
      { id: 'p2', name: 'zon.jpg', mimeType: 'image/jpeg' },
      { id: 't1', name: 'notes.txt', mimeType: 'text/plain' },
      { id: 'p1', name: 'fiets.png', mimeType: 'image/png' },
    ] } })

    const res = await listPictures()

    expect(await res.json()).toEqual([{ id: 'p1', name: 'fiets.png' }, { id: 'p2', name: 'zon.jpg' }])
    expect(filesListMock.mock.calls[0][0].q).toContain("'pics' in parents")
  })
})

describe('GET /api/pictures/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await pictureRequest('p1')).status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid file id', async () => {
    expect((await pictureRequest('../x')).status).toBe(400)
  })

  it('streams an image with its content type', async () => {
    filesGetMock.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': '3' },
      data: Readable.from([Buffer.from('png')]),
    })

    const res = await pictureRequest('p1')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(await res.text()).toBe('png')
  })

  it('refuses a file that is not an image', async () => {
    filesGetMock.mockResolvedValue({ status: 200, headers: { 'content-type': 'video/mp4' }, data: Readable.from([]) })

    expect((await pictureRequest('v1')).status).toBe(415)
  })
})
