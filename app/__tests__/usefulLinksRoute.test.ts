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

import { GET, POST, PUT, DELETE } from '../api/useful-links/route'
import { DEFAULT_USEFUL_LINKS } from '../lib/driveStore'

const link = { id: 'u1', title: 'Woordenboek', url: 'https://www.vandale.nl/', createdAt: '2026-01-01T00:00:00.000Z' }
const island = { id: 'i1', english: 'Hi', options: [], createdAt: '2026-01-01T00:00:00.000Z' }

function mockRoot(root: Record<string, unknown>) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], languageIslands: [island], ...root }) })
}

async function writtenRoot(): Promise<Record<string, unknown>> {
  const body = filesUpdateMock.mock.calls[0][0].media.body
  let text = ''
  for await (const chunk of body) text += chunk
  return JSON.parse(text)
}

const request = (method: string, body: unknown) =>
  new NextRequest('http://localhost/api/useful-links', { method, body: JSON.stringify(body) })

describe('/api/useful-links', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    filesUpdateMock.mockResolvedValue({})
    mockRoot({ usefulLinks: [link] })
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect((await POST(request('POST', { url: 'https://a.nl' }))).status).toBe(401)
    expect((await PUT(request('PUT', { id: 'u1', title: 'x' }))).status).toBe(401)
    expect((await DELETE(request('DELETE', { id: 'u1' }))).status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('GET returns the stored links', async () => {
    expect(await (await GET()).json()).toEqual({ links: [link] })
  })

  it('GET starts with the NT2 schrijven doc when the file has no usefulLinks key yet', async () => {
    mockRoot({})

    const { links } = await (await GET()).json()

    expect(links).toEqual(DEFAULT_USEFUL_LINKS)
    expect(links[0].url).toContain('1-wJ6gufratEw-caqq4eg28VpQtLgPpAg1-eNEsgNme4')
  })

  it('GET keeps an emptied list empty', async () => {
    mockRoot({ usefulLinks: [] })

    expect(await (await GET()).json()).toEqual({ links: [] })
  })

  it('POST adds the link at the end and keeps the rest of the file', async () => {
    const res = await POST(request('POST', { title: ' Taalunie ', url: ' https://taalunie.org ' }))

    const { links } = await res.json()
    expect(links).toHaveLength(2)
    expect(links[1]).toMatchObject({ title: 'Taalunie', url: 'https://taalunie.org' })
    const root = await writtenRoot()
    expect(root.usefulLinks).toEqual(links)
    expect(root.languageIslands).toEqual([island])
  })

  it('POST uses the URL as name when no name is given', async () => {
    const { links } = await (await POST(request('POST', { url: 'https://taalunie.org' }))).json()

    expect(links[1].title).toBe('https://taalunie.org')
  })

  it('POST rejects a link that is not http(s)', async () => {
    expect((await POST(request('POST', { url: 'javascript:alert(1)' }))).status).toBe(400)
    expect((await POST(request('POST', { url: 'geen link' }))).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('PUT changes the name and the link', async () => {
    const { links } = await (await PUT(request('PUT', { id: 'u1', title: 'Van Dale', url: 'https://vandale.nl' }))).json()

    expect(links).toEqual([{ ...link, title: 'Van Dale', url: 'https://vandale.nl' }])
  })

  it('PUT rejects an empty name or a bad link', async () => {
    expect((await PUT(request('PUT', { id: 'u1', title: ' ' }))).status).toBe(400)
    expect((await PUT(request('PUT', { id: 'u1', url: 'ftp://x' }))).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('DELETE removes the link', async () => {
    const { links } = await (await DELETE(request('DELETE', { id: 'u1' }))).json()

    expect(links).toEqual([])
    expect((await writtenRoot()).usefulLinks).toEqual([])
  })
})
