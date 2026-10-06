import { useState, useCallback, useRef } from 'react'
import type { Article, ArticleFolder, ArticleItem } from '../types'
import { useMarkedFiles } from './useMarkedFiles'

async function fetchJsonAsync<T>(url: string, fallbackError: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || fallbackError)
  return data as T
}

export function useArticles() {
  const [folderStack, setFolderStack] = useState<ArticleFolder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [foldersError, setFoldersError] = useState<string | null>(null)

  const [article, setArticle] = useState<Article | null>(null)
  const [articleLoading, setArticleLoading] = useState(false)
  const [articleError, setArticleError] = useState<string | null>(null)

  const rootRequested = useRef(false)
  const { markedIds: readArticleIds, loadMarkedIds: loadReadArticleIds, toggleMarked: toggleArticleRead } = useMarkedFiles('articles')

  const currentFolder = folderStack[folderStack.length - 1] ?? null

  const fetchFolderAsync = useCallback(async (folderId: string | undefined, push: boolean) => {
    setFoldersLoading(true)
    setFoldersError(null)
    try {
      const url = folderId ? `/api/articles?folderId=${encodeURIComponent(folderId)}` : '/api/articles'
      const folder = await fetchJsonAsync<ArticleFolder>(url, 'Kon artikelenlijst niet laden.')
      setFolderStack(prev => (push ? [...prev, folder] : [folder]))
    } catch (err) {
      console.error('[useArticles]', (err as Error).message)
      setFoldersError((err as Error).message)
    } finally {
      setFoldersLoading(false)
    }
  }, [])

  const loadRoot = useCallback((force = false) => {
    if (!force && rootRequested.current) return
    rootRequested.current = true
    fetchFolderAsync(undefined, false)
  }, [fetchFolderAsync])

  const goToFolderIndex = useCallback((index: number) => {
    setFolderStack(prev => prev.slice(0, index + 1))
    setArticle(null)
    setArticleError(null)
  }, [])

  const openItemAsync = useCallback(async (item: ArticleItem) => {
    if (item.kind === 'folder') {
      await fetchFolderAsync(item.id, true)
      return
    }
    setArticleLoading(true)
    setArticleError(null)
    setArticle({ id: item.id, name: item.name, paragraphs: [] })
    try {
      setArticle(await fetchJsonAsync<Article>(`/api/articles/${encodeURIComponent(item.id)}`, 'Kon artikel niet laden.'))
    } catch (err) {
      console.error('[useArticles]', (err as Error).message)
      setArticleError((err as Error).message)
    } finally {
      setArticleLoading(false)
    }
  }, [fetchFolderAsync])

  const closeArticle = useCallback(() => {
    setArticle(null)
    setArticleError(null)
  }, [])

  return {
    folderStack,
    currentFolder,
    foldersLoading,
    foldersError,
    article,
    articleLoading,
    articleError,
    loadRoot,
    goToFolderIndex,
    openItemAsync,
    closeArticle,
    readArticleIds,
    loadReadArticleIds,
    toggleArticleRead,
  }
}
