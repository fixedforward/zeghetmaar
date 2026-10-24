// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, getMock, addMock, deleteMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getMock: vi.fn(),
  addMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/app/lib/driveStore', () => ({
  getHardToHearPhrasesAsync: getMock,
  addHardToHearPhraseAsync: addMock,
  deleteHardToHearPhraseAsync: deleteMock,
}))

import { GET, POST, DELETE } from '../api/luisteren/hard-to-hear/route'

const URL = 'http://localhost/api/luisteren/hard-to-hear'
const jsonRequest = (method: string, body: unknown) =>
  new NextRequest(URL, { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

const phrase = { id: 'h1', text: 'Dat zie je wel vaker.', seconds: 12.5, createdAt: '2024-01-01T00:00:00.000Z' }

describe('/api/luisteren/hard-to-hear', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMock.mockResolvedValue({ user: { email: 'me@example.com' } })
  })

  it('requires login', async () => {
    authMock.mockResolvedValue(null)

    expect((await GET(new NextRequest(`${URL}?video=Journaal`))).status).toBe(401)
    expect((await POST(jsonRequest('POST', { video: 'Journaal', text: 'a', seconds: 1 }))).status).toBe(401)
    expect((await DELETE(jsonRequest('DELETE', { video: 'Journaal', id: 'h1' }))).status).toBe(401)
    expect(getMock).not.toHaveBeenCalled()
  })

  it('GET returns the lines of the video', async () => {
    getMock.mockResolvedValue([phrase])

    const res = await GET(new NextRequest(`${URL}?video=${encodeURIComponent('Het Journaal')}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ phrases: [phrase] })
    expect(getMock).toHaveBeenCalledWith('Het Journaal')
  })

  it('GET without a video is a 400', async () => {
    expect((await GET(new NextRequest(URL))).status).toBe(400)
  })

  it('POST adds the trimmed line', async () => {
    addMock.mockResolvedValue([phrase])

    const res = await POST(jsonRequest('POST', { video: 'Het Journaal', text: '  Dat zie je wel vaker. ', seconds: 12.5 }))

    expect(res.status).toBe(200)
    expect(addMock).toHaveBeenCalledWith('Het Journaal', 'Dat zie je wel vaker.', 12.5)
  })

  it.each([
    [{ text: 'a', seconds: 1 }],
    [{ video: 'v', seconds: 1 }],
    [{ video: 'v', text: 'a', seconds: -1 }],
    [{ video: 'v', text: 'a', seconds: '1' }],
  ])('POST rejects %j', async body => {
    expect((await POST(jsonRequest('POST', body))).status).toBe(400)
    expect(addMock).not.toHaveBeenCalled()
  })

  it('DELETE removes the line by id', async () => {
    deleteMock.mockResolvedValue([])

    const res = await DELETE(jsonRequest('DELETE', { video: 'Het Journaal', id: 'h1' }))

    expect(res.status).toBe(200)
    expect(deleteMock).toHaveBeenCalledWith('Het Journaal', 'h1')
  })

  it('DELETE without an id is a 400', async () => {
    expect((await DELETE(jsonRequest('DELETE', { video: 'Het Journaal' }))).status).toBe(400)
  })
})
