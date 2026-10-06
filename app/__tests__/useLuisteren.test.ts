import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLuisteren } from '../hooks/useLuisteren'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const fail = (error: string) => ({ ok: false, json: () => Promise.resolve({ error }) } as Response)

const link = { id: 'l1', title: 'Journaal', url: 'https://youtu.be/a', createdAt: '2024-01-01T00:00:00.000Z' }

describe('useLuisteren', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the links once, unless forced', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [link] }))
    const { result } = renderHook(() => useLuisteren())

    await act(async () => { result.current.loadLinks() })
    await act(async () => { result.current.loadLinks() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.links).toEqual([link])

    await act(async () => { result.current.loadLinks(true) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('addLinkAsync posts the link and replaces the list with the server response', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [link] }))
    const { result } = renderHook(() => useLuisteren())

    let saved = false
    await act(async () => { saved = await result.current.addLinkAsync('https://youtu.be/a', 'Journaal') })

    expect(saved).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/luisteren', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtu.be/a', title: 'Journaal' }),
    }))
    expect(result.current.links).toEqual([link])
  })

  it('addLinkAsync shows the server error and keeps the list on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(fail('Geef een geldige YouTube-link op.'))
    const { result } = renderHook(() => useLuisteren())

    let saved = true
    await act(async () => { saved = await result.current.addLinkAsync('https://vimeo.com/1', '') })

    expect(saved).toBe(false)
    expect(result.current.error).toBe('Geef een geldige YouTube-link op.')
    expect(result.current.links).toEqual([])
  })

  it('deleteLinkAsync sends the id with DELETE', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [] }))
    const { result } = renderHook(() => useLuisteren())

    await act(async () => { await result.current.deleteLinkAsync('l1') })

    expect(fetch).toHaveBeenCalledWith('/api/luisteren', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ id: 'l1' }),
    }))
    expect(result.current.links).toEqual([])
  })
})
