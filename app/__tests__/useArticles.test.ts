import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useArticles } from '../hooks/useArticles'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

const root = { id: 'root', name: 'Lezen', items: [{ id: 'f1', name: 'articles', kind: 'folder' }] }
const sub = { id: 'f1', name: 'articles', items: [{ id: 'd1', name: 'Bier', kind: 'article' }] }
const article = { id: 'd1', name: 'Bier', paragraphs: ['Titel', 'Alinea.'] }

describe('useArticles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the root folder once, even when loadRoot is called again', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok(root))
    const { result } = renderHook(() => useArticles())

    await act(async () => { result.current.loadRoot() })
    await act(async () => { result.current.loadRoot() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/articles')
    expect(result.current.currentFolder).toEqual(root)
  })

  it('does not retry the root after an error unless forced', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Kapot' }) } as Response)
    const { result } = renderHook(() => useArticles())

    await act(async () => { result.current.loadRoot() })
    await act(async () => { result.current.loadRoot() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.foldersError).toBe('Kapot')

    await act(async () => { result.current.loadRoot(true) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('navigates into a folder, opens an article, and goes back via the breadcrumb', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ok(root))
      .mockResolvedValueOnce(ok(sub))
      .mockResolvedValueOnce(ok(article))
    const { result } = renderHook(() => useArticles())

    await act(async () => { result.current.loadRoot() })
    await act(async () => { await result.current.openItemAsync(root.items[0] as never) })
    expect(fetch).toHaveBeenLastCalledWith('/api/articles?folderId=f1')
    expect(result.current.folderStack.map(f => f.id)).toEqual(['root', 'f1'])

    await act(async () => { await result.current.openItemAsync(sub.items[0] as never) })
    expect(fetch).toHaveBeenLastCalledWith('/api/articles/d1')
    expect(result.current.article).toEqual(article)

    act(() => { result.current.goToFolderIndex(0) })
    expect(result.current.article).toBeNull()
    expect(result.current.folderStack.map(f => f.id)).toEqual(['root'])
  })

  it('loads read article ids and toggles one via /api/marked-files/articles', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ fileIds: ['d1'] }))
    const { result } = renderHook(() => useArticles())

    await act(async () => { result.current.loadReadArticleIds() })
    expect(fetch).toHaveBeenCalledWith('/api/marked-files/articles')
    expect(result.current.readArticleIds).toEqual(new Set(['d1']))

    act(() => { result.current.toggleArticleRead('d1') })
    expect(result.current.readArticleIds.has('d1')).toBe(false)
    expect(fetch).toHaveBeenLastCalledWith('/api/marked-files/articles', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ fileId: 'd1' }),
    }))
  })
})
