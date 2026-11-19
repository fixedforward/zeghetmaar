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

import { GET, POST, PUT, DELETE } from '../api/notes/route'

const note = { id: 'n1', title: 'Grammatica', text: 'Om te + infinitief', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
const link = { id: 'u1', title: 'Van Dale', url: 'https://vandale.nl', createdAt: '2026-01-01T00:00:00.000Z' }

function mockRoot(notes: unknown) {
  filesGetMock.mockResolvedValue({ data: JSON.stringify({ phrases: [], usefulLinks: [link], notes }) })
}

async function writtenRoot(): Promise<Record<string, unknown>> {
  const body = filesUpdateMock.mock.calls[0][0].media.body
  let text = ''
  for await (const chunk of body) text += chunk
  return JSON.parse(text)
}

const request = (method: string, body: unknown) =>
  new NextRequest('http://localhost/api/notes', { method, body: JSON.stringify(body) })

describe('/api/notes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
    filesUpdateMock.mockResolvedValue({})
    mockRoot([note])
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect((await POST(request('POST', { text: 'x' }))).status).toBe(401)
    expect((await PUT(request('PUT', { id: 'n1', text: 'x' }))).status).toBe(401)
    expect((await DELETE(request('DELETE', { id: 'n1' }))).status).toBe(401)
    expect(filesGetMock).not.toHaveBeenCalled()
  })

  it('GET returns the stored notes, and none when the file has no notes yet', async () => {
    expect(await (await GET()).json()).toEqual({ notes: [note] })

    mockRoot(undefined)
    expect(await (await GET()).json()).toEqual({ notes: [] })
  })

  it('GET drops malformed notes', async () => {
    mockRoot([note, { id: 'x' }])

    expect(await (await GET()).json()).toEqual({ notes: [note] })
  })

  it('POST adds the trimmed note first and keeps the rest of the file', async () => {
    const { notes } = await (await POST(request('POST', { title: ' Werkwoorden ', text: ' liggen/leggen\n ' }))).json()

    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatchObject({ title: 'Werkwoorden', text: 'liggen/leggen' })
    expect(notes[0].createdAt).toBe(notes[0].updatedAt)
    const root = await writtenRoot()
    expect(root.notes).toEqual(notes)
    expect(root.usefulLinks).toEqual([link])
  })

  it('POST rejects an empty note', async () => {
    expect((await POST(request('POST', { title: 'Leeg', text: '  ' }))).status).toBe(400)
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('PUT changes the text and sets updatedAt', async () => {
    const { notes } = await (await PUT(request('PUT', { id: 'n1', text: 'Om te + infinitief, bijv. om te leren' }))).json()

    expect(notes[0]).toMatchObject({ title: 'Grammatica', text: 'Om te + infinitief, bijv. om te leren', createdAt: note.createdAt })
    expect(notes[0].updatedAt).not.toBe(note.updatedAt)
  })

  it('PUT rejects empty text and does not write for an unknown id', async () => {
    expect((await PUT(request('PUT', { id: 'n1', text: ' ' }))).status).toBe(400)
    expect(await (await PUT(request('PUT', { id: 'nope', title: 'x' }))).json()).toEqual({ notes: [note] })
    expect(filesUpdateMock).not.toHaveBeenCalled()
  })

  it('DELETE removes the note', async () => {
    const { notes } = await (await DELETE(request('DELETE', { id: 'n1' }))).json()

    expect(notes).toEqual([])
    expect((await writtenRoot()).notes).toEqual([])
  })
})
