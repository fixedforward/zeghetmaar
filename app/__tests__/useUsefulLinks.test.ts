import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUsefulLinks } from '../hooks/useUsefulLinks'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const fail = (error: string) => ({ ok: false, json: () => Promise.resolve({ error }) } as Response)

const link = { id: 'u1', title: 'Van Dale', url: 'https://vandale.nl', createdAt: '2026-01-01T00:00:00.000Z' }

type FetchInit = { method?: string; body?: string }

describe('useUsefulLinks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('loads the links once', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [link] }))
    const { result } = renderHook(() => useUsefulLinks())

    await act(async () => { result.current.loadLinks() })
    await act(async () => { result.current.loadLinks() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.links).toEqual([link])
  })

  it('addLinkAsync posts the name and link and keeps the saved list', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [link] }))
    const { result } = renderHook(() => useUsefulLinks())

    let done = false
    await act(async () => { done = await result.current.addLinkAsync('Van Dale', 'https://vandale.nl') })

    expect(done).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, FetchInit]
    expect(url).toBe('/api/useful-links')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body ?? '{}')).toEqual({ title: 'Van Dale', url: 'https://vandale.nl' })
    expect(result.current.links).toEqual([link])
  })

  it('setTitleAsync, setUrlAsync and deleteLinkAsync send the right request', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [] }))
    const { result } = renderHook(() => useUsefulLinks())

    await act(async () => { await result.current.setTitleAsync('u1', 'Woordenboek') })
    await act(async () => { await result.current.setUrlAsync('u1', 'https://a.nl') })
    await act(async () => { await result.current.deleteLinkAsync('u1') })

    const calls = vi.mocked(fetch).mock.calls.map(c => ({ method: (c[1] as FetchInit).method, body: JSON.parse((c[1] as FetchInit).body ?? '{}') }))
    expect(calls).toEqual([
      { method: 'PUT', body: { id: 'u1', title: 'Woordenboek' } },
      { method: 'PUT', body: { id: 'u1', url: 'https://a.nl' } },
      { method: 'DELETE', body: { id: 'u1' } },
    ])
  })

  it('shows the error and returns false when saving fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(fail('Geef een geldige link op (http of https).'))
    const { result } = renderHook(() => useUsefulLinks())

    let done = true
    await act(async () => { done = await result.current.addLinkAsync('', 'x') })

    expect(done).toBe(false)
    expect(result.current.error).toBe('Geef een geldige link op (http of https).')
  })
})
