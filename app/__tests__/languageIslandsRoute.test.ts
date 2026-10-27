// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, filesGetMock, filesUpdateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  filesGetMock: vi.fn(),
  filesUpdateMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/config', () => ({
  config: { database: { googleJsonFile: { googleDriveFileId: 'file123', serviceAccount: {} } } },
}))
vi.mock('fs', () => ({ writeFileSync: vi.fn(), default: { writeFileSync: vi.fn() } }))
vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn() },
    drive: () => ({ files: { get: filesGetMock, update: filesUpdateMock } }),
  },
}))

import { GET, POST, PUT, DELETE } from '../api/language-islands/route'

const island = { id: 'i1', english: 'I work from home on Fridays', options: ['Ik werk vrijdags thuis.'], createdAt: '2026-01-01T00:00:00.000Z' }

function mockRoot(languageIslands: unknown[]) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], listeningLinks: [{ id: 'l1', title: 'x', url: 'https://youtu.be/a', createdAt: '2026-01-01' }], languageIslands }) })
}

async function writtenRoot(): Promise<Record<string, unknown>> {
  const body = filesUpdateMock.mock.calls[0][0].media.body
  let text = ''
  for await (const chunk of body) text += chunk
  return JSON.parse(text)
}

const request = (method: string, body: unknown) =>
  new NextRequest('http://localhost/api/language-islands', { method, body: JSON.stringify(body) })

describe('/api/language-islands', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    filesUpdateMock.mockResolvedValue({})
    mockRoot([island])
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect((await POST(request('POST', { english: 'Hi' }))).status).toBe(401)
    expect((await PUT(request('PUT', { id: 'i1', options: [] }))).status).toBe(401)
    expect((await DELETE(request('DELETE', { id: 'i1' }))).status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('GET returns the stored islands', async () => {
    expect(await (await GET()).json()).toEqual({ islands: [island] })
  })

  it('POST adds the trimmed phrase first, without options, and keeps the rest of the root', async () => {
    const res = await POST(request('POST', { english: '  See you later  ' }))
    const { islands } = await res.json()

    expect(islands).toHaveLength(2)
    expect(islands[0]).toMatchObject({ english: 'See you later', options: [] })
    const root = await writtenRoot()
    expect(root.languageIslands).toEqual(islands)
    expect(root.listeningLinks).toHaveLength(1)
  })

  it('POST rejects an empty phrase', async () => {
    expect((await POST(request('POST', { english: '  ' }))).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('PUT replaces the options of that island', async () => {
    const res = await PUT(request('PUT', { id: 'i1', options: [' Ik werk thuis op vrijdag. '] }))

    expect((await res.json()).islands).toEqual([{ ...island, options: ['Ik werk thuis op vrijdag.'] }])
    expect((await writtenRoot()).languageIslands).toEqual([{ ...island, options: ['Ik werk thuis op vrijdag.'] }])
  })

  it('PUT changes the English phrase and keeps the options', async () => {
    const res = await PUT(request('PUT', { id: 'i1', english: 'I work from home' }))

    expect((await res.json()).islands).toEqual([{ ...island, english: 'I work from home' }])
  })

  it('PUT rejects options that are not non-empty strings', async () => {
    expect((await PUT(request('PUT', { id: 'i1', options: ['ok', ''] }))).status).toBe(400)
    expect((await PUT(request('PUT', { id: 'i1', options: 'ok' }))).status).toBe(400)
    expect((await PUT(request('PUT', { options: ['ok'] }))).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('PUT with an unknown id does not write', async () => {
    const res = await PUT(request('PUT', { id: 'nope', options: ['x'] }))

    expect((await res.json()).islands).toEqual([island])
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('DELETE removes the island', async () => {
    const res = await DELETE(request('DELETE', { id: 'i1' }))

    expect((await res.json()).islands).toEqual([])
    expect((await writtenRoot()).languageIslands).toEqual([])
  })

  it('drops malformed islands when reading', async () => {
    mockRoot([island, { id: 'x' }, { ...island, id: 'i2', options: ['ok', 3] }])

    expect((await (await GET()).json()).islands).toEqual([island, { ...island, id: 'i2', options: ['ok'] }])
  })

  it('returns 500 when Drive fails', async () => {
    filesGetMock.mockRejectedValue(new Error('drive down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await GET()).status).toBe(500)
  })
})
