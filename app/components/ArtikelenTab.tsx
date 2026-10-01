import { useEffect } from 'react'
import type { useArticles } from '../hooks/useArticles'
import { useChatGptSelection } from '../hooks/useChatGptSelection'
import { ChatGptSelectionLink } from './ChatGptSelectionLink'

type Props = ReturnType<typeof useArticles> & {
  isLoggedIn: boolean
}

export function ArtikelenTab(articles: Props) {
  const { chatGptLink, handleTextSelection, closeChatGptLink } = useChatGptSelection()
  const { isLoggedIn, loadRoot } = articles

  useEffect(() => {
    if (isLoggedIn) loadRoot()
  }, [isLoggedIn, loadRoot])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om artikelen te lezen.</p>
  }

  const breadcrumb = (
    <div className="flex flex-wrap items-center gap-1 text-sm mb-3">
      {articles.folderStack.map((folder, i) => {
        const isLast = i === articles.folderStack.length - 1 && !articles.article
        return (
          <span key={folder.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300">/</span>}
            {isLast ? (
              <span className="text-gray-700 font-medium">{folder.name || 'Artikelen'}</span>
            ) : (
              <button onClick={() => articles.goToFolderIndex(i)} className="text-blue-600 hover:underline">
                {folder.name || 'Artikelen'}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )

  if (articles.article) {
    return (
      <div>
        {breadcrumb}
        <div className="flex justify-between items-start gap-3 mb-2">
          <h2 className="text-lg font-semibold">{articles.article.name}</h2>
          <button onClick={articles.closeArticle} className="text-sm text-blue-600 hover:underline shrink-0">
            ← Terug
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Tip: selecteer een woord of zin om uitleg te krijgen via ChatGPT.
        </p>
        {articles.articleLoading && <p className="text-sm text-gray-400">Artikel laden...</p>}
        {articles.articleError && <p className="text-sm text-red-500">{articles.articleError}</p>}
        <article className="border rounded p-4 bg-white space-y-3 leading-relaxed" onMouseUp={handleTextSelection}>
          {articles.article.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </article>
        <ChatGptSelectionLink link={chatGptLink} onClose={closeChatGptLink} />
      </div>
    )
  }

  const items = articles.currentFolder?.items ?? []

  return (
    <div>
      {breadcrumb}
      {articles.foldersLoading && <p className="text-sm text-gray-400">Laden...</p>}
      {articles.foldersError && <p className="text-sm text-red-500">{articles.foldersError}</p>}
      {!articles.foldersLoading && !articles.foldersError && articles.currentFolder && items.length === 0 && (
        <p className="text-sm text-gray-400">Geen artikelen gevonden.</p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => articles.openItemAsync(item)}
              disabled={articles.foldersLoading}
              className="w-full text-left border rounded p-3 bg-white hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <span className="shrink-0">{item.kind === 'folder' ? '📁' : '📄'}</span>
              <span className="truncate min-w-0">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
