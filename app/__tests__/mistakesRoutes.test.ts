// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, filesGetMock, filesUpdateMock, config } = vi.hoisted(() => ({
  authMock: vi.fn(),
  filesGetMock: vi.fn(),
  filesUpdateMock: vi.fn(),
  config: { database: {} as { googleMistakesFile?: { fileId: string } } },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/config', () => ({ config }))
vi.mock('@/app/lib/driveStore', () => ({
  getDriveClient: () => ({ files: { get: filesGetMock, update: filesUpdateMock } }),
}))

import { GET, PUT, DELETE } from '../api/mistakes/route'

const TSV = 'Mijn fout\tMogelijke verbetering\tType fout\tnoOfTimesPracticed\nik ben eens\tIk ben het eens.\tGrammar fix\t0\n'

function mockDriveFile(text: string) {
  filesGetMock.mockImplementation(async (params: { alt?: string }) =>
    params.alt === 'media' ? { data: text } : { data: { mimeType: 'text/tab-separated-values' } })
}

const putRequest = (body: unknown) =>
  PUT(new NextRequest('http://localhost/api/mistakes', { method: 'PUT', body: JSON.stringify(body) }))

const deleteRequest = (body: unknown) =>
  DELETE(new NextRequest('http://localhost/api/mistakes', { method: 'DELETE', body: JSON.stringify(body) }))

async function uploadedText(): Promise<string> {
  const body = filesUpdateMock.mock.calls[0][0].media.body
  let text = ''
  for await (const chunk of body) text += chunk
  return text
}

describe('/api/mistakes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    config.database = { googleMistakesFile: { fileId: 'tsv1' } }
    mockDriveFile(TSV)
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect((await putRequest({ row: 1, mistake: 'ik ben eens', timesPracticed: 1 })).status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('returns 501 when the file is not configured', async () => {
    config.database = {}

    expect((await GET()).status).toBe(501)
  })

  it('GET reads and parses the .tsv from Drive', async () => {
    const res = await GET()

    expect(await res.json()).toEqual({
      mistakes: [{ row: 1, mistake: 'ik ben eens', correction: 'Ik ben het eens.', type: 'Grammar fix', timesPracticed: 0 }],
    })
    expect(filesGetMock).toHaveBeenCalledWith(expect.objectContaining({ fileId: 'tsv1', alt: 'media' }), expect.anything())
  })

  it('PUT writes the new count back to the same Drive file', async () => {
    const res = await putRequest({ row: 1, mistake: 'ik ben eens', timesPracticed: 1 })

    expect(res.status).toBe(200)
    expect(filesUpdateMock.mock.calls[0][0].fileId).toBe('tsv1')
    expect(await uploadedText()).toBe(TSV.replace('Grammar fix\t0', 'Grammar fix\t1'))
  })

  it('PUT returns 409 when the row no longer holds that mistake', async () => {
    const res = await putRequest({ row: 1, mistake: 'een andere fout', timesPracticed: 1 })

    expect(res.status).toBe(409)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('PUT rejects bad input', async () => {
    expect((await putRequest({ row: 1, mistake: 'ik ben eens', timesPracticed: -1 })).status).toBe(400)
    expect((await putRequest({ row: '1', mistake: 'ik ben eens', timesPracticed: 1 })).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('DELETE removes that row from the Drive file', async () => {
    const res = await deleteRequest({ row: 1, mistake: 'ik ben eens' })

    expect(res.status).toBe(200)
    expect(await uploadedText()).toBe('Mijn fout\tMogelijke verbetering\tType fout\tnoOfTimesPracticed\n')
  })

  it('DELETE returns 409 when the row no longer holds that mistake, and 401 without login', async () => {
    expect((await deleteRequest({ row: 1, mistake: 'iets anders' })).status).toBe(409)
    authMock.mockResolvedValue(null)
    expect((await deleteRequest({ row: 1, mistake: 'ik ben eens' })).status).toBe(401)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })
})
