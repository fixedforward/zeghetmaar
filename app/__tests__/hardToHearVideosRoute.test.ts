// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { authMock, videosMock, rootMock } = vi.hoisted(() => ({ authMock: vi.fn(), videosMock: vi.fn(), rootMock: vi.fn() }))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/driveListeningStore', () => ({
  getHardToHearVideosAsync: videosMock,
  getListeningRootFolderId: rootMock,
}))

import { GET } from '../api/luisteren/hard-to-hear/videos/route'

describe('GET /api/luisteren/hard-to-hear/videos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    rootMock.mockReturnValue('root1')
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect(videosMock).not.toHaveBeenCalled()
  })

  it('is 501 when the Luisteren folder is not configured', async () => {
    rootMock.mockReturnValue(undefined)

    expect((await GET()).status).toBe(501)
  })

  it('returns the videos of the Luisteren folder', async () => {
    const videos = [{ key: 'a', name: 'A', folderId: 'root1', fileId: 'v1', phrases: [] }]
    videosMock.mockResolvedValue(videos)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ videos })
    expect(videosMock).toHaveBeenCalledWith('root1')
  })

  it('is 500 when Drive fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    videosMock.mockRejectedValue(new Error('boom'))

    expect((await GET()).status).toBe(500)
  })
})
