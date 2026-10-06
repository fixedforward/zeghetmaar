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

  it('setPositionAsync sends the id and seconds with PUT', async () => {
    const updated = { ...link, positionSeconds: 1043 }
    global.fetch = vi.fn().mockResolvedValue(ok({ links: [updated] }))
    const { result } = renderHook(() => useLuisteren())

    await act(async () => { await result.current.setPositionAsync('l1', 1043) })

    expect(fetch).toHaveBeenCalledWith('/api/luisteren', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ id: 'l1', positionSeconds: 1043 }),
    }))
    expect(result.current.links).toEqual([updated])
  })

  describe('phrases', () => {
    const phrase = { id: 'p1', text: 'gezellig', imported: false }
    const withPhrase = { ...link, phrases: [phrase] }

    const renderWithLinkAsync = async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ links: [withPhrase] }))
      const hook = renderHook(() => useLuisteren())
      await act(async () => { hook.result.current.loadLinks() })
      return hook
    }

    const sentPhrases = () => JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.lastCall![1].body).phrases

    it('addPhraseAsync appends a trimmed, not-yet-imported phrase with PUT', async () => {
      const { result } = await renderWithLinkAsync()

      await act(async () => { await result.current.addPhraseAsync('l1', '  op de hoogte  ') })

      expect((fetch as ReturnType<typeof vi.fn>).mock.lastCall![1].method).toBe('PUT')
      expect(sentPhrases()).toEqual([phrase, expect.objectContaining({ text: 'op de hoogte', imported: false })])
    })

    it('addPhraseAsync stores the time the phrase was said when given', async () => {
      const { result } = await renderWithLinkAsync()

      await act(async () => { await result.current.addPhraseAsync('l1', 'op de hoogte', 1043) })

      expect(sentPhrases()[1]).toEqual(expect.objectContaining({ text: 'op de hoogte', seconds: 1043 }))
    })

    it('setPhraseSecondsAsync sets and clears the time of only that phrase', async () => {
      const { result } = await renderWithLinkAsync()

      await act(async () => { await result.current.setPhraseSecondsAsync('l1', 'p1', 1043) })
      expect(sentPhrases()).toEqual([{ ...phrase, seconds: 1043 }])

      await act(async () => { await result.current.setPhraseSecondsAsync('l1', 'p1', null) })
      expect(sentPhrases()).toEqual([phrase])
    })

    it('markPhraseImportedAsync marks only that phrase as imported', async () => {
      const { result } = await renderWithLinkAsync()

      await act(async () => { await result.current.markPhraseImportedAsync('l1', 'p1') })

      expect(sentPhrases()).toEqual([{ ...phrase, imported: true }])
    })

    it('deletePhraseAsync removes the phrase', async () => {
      const { result } = await renderWithLinkAsync()

      await act(async () => { await result.current.deletePhraseAsync('l1', 'p1') })

      expect(sentPhrases()).toEqual([])
    })
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
