// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, deleteWordMock, getAllWordsMock, deletePicturesMock, afterMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  deleteWordMock: vi.fn(),
  getAllWordsMock: vi.fn(),
  deletePicturesMock: vi.fn(),
  afterMock: vi.fn(),
}))

vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), after: afterMock }))
vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/driveStore', () => ({
  deleteWord: deleteWordMock,
  getAllWords: getAllWordsMock,
  isValidObjectId: (id: string) => id.length > 0,
}))
vi.mock('@/app/lib/drivePictureStore', () => ({ deletePhrasePicturesAsync: deletePicturesMock }))

import { DELETE } from '../api/words/route'

const deleteRequest = (id: string) =>
  new NextRequest('http://localhost/api/words', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })

const removed = { id: 'w1', word: 'fiets', meanings: [] }
const remaining = [{ id: 'w2', word: 'auto', meanings: [] }]

// Runs what the route handed to after(), like Next.js does once the response is sent.
const runAfterAsync = () => (afterMock.mock.calls[0][0] as () => Promise<void>)()

describe('DELETE /api/words', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    deleteWordMock.mockResolvedValue(removed)
    getAllWordsMock.mockResolvedValue(remaining)
    deletePicturesMock.mockResolvedValue(undefined)
  })

  it('answers before the pictures are removed, then removes them in the background', async () => {
    const res = await DELETE(deleteRequest('w1'))

    expect(res.status).toBe(200)
    expect(deletePicturesMock).not.toHaveBeenCalled()

    await runAfterAsync()
    expect(deletePicturesMock).toHaveBeenCalledWith(removed, remaining)
  })

  it('only logs when removing the pictures fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    deletePicturesMock.mockRejectedValue(new Error('Drive down'))

    await DELETE(deleteRequest('w1'))

    await expect(runAfterAsync()).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it('removes no pictures when the word does not exist', async () => {
    deleteWordMock.mockResolvedValue(null)

    const res = await DELETE(deleteRequest('nope'))

    expect(res.status).toBe(404)
    expect(afterMock).not.toHaveBeenCalled()
  })
})
