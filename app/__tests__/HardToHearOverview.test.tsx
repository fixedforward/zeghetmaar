import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HardToHearOverview } from '../components/HardToHearOverview'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const line = (id: string) => ({ id, text: `Zin ${id}.`, seconds: 1, endSeconds: 2, createdAt: '2024-01-01T00:00:00.000Z' })

describe('HardToHearOverview', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lists each video with a practice link, and marks a video that is gone', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ videos: [
      { key: 'hetjournaal', name: 'Het Journaal', folderId: 'f 1', fileId: 'v1', phrases: [line('a'), line('b')] },
      { key: 'weg', name: 'weg', folderId: null, fileId: null, phrases: [line('c')] },
    ] }))

    render(<HardToHearOverview />)

    const practice = await screen.findByText('Oefenen (2)')
    expect(practice.getAttribute('href')).toBe('/luisteren-oefenen?folder=f%201&file=v1')
    expect(screen.getByText('Openen in speler').getAttribute('href')).toBe('/luisteren-test?folder=f%201&file=v1')
    expect(screen.getByText('Video niet gevonden in de Luisteren-map')).toBeTruthy()
    expect(screen.getByText('Zin a.')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/api/luisteren/hard-to-hear/videos')
  })

  it('says how to add fragments when there are none', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ videos: [] }))

    render(<HardToHearOverview />)

    expect(await screen.findByText(/Nog geen fragmenten/)).toBeTruthy()
  })

  it('shows the API error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Login om feature te gebruiken.' }) } as Response)

    render(<HardToHearOverview />)

    expect(await screen.findByText('Login om feature te gebruiken.')).toBeTruthy()
  })
})
