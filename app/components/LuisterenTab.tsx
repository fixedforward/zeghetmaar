import { useEffect, useState } from 'react'
import type { useLuisteren } from '../hooks/useLuisteren'
import { formatDutchDate } from '../lib/date'
import { isYouTubeUrl } from '../lib/youtube'

type Props = ReturnType<typeof useLuisteren> & {
  isLoggedIn: boolean
}

export function LuisterenTab({ links, loading, saving, error, loadLinks, addLinkAsync, deleteLinkAsync, isLoggedIn }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoggedIn) loadLinks()
  }, [isLoggedIn, loadLinks])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je luisterlinks te zien.</p>
  }

  const urlValid = isYouTubeUrl(url)

  const handleAdd = async () => {
    if (!urlValid || saving) return
    if (await addLinkAsync(url.trim(), title.trim())) {
      setUrl('')
      setTitle('')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Bewaar YouTube-video&apos;s om naar te luisteren. Klik op een link om de video te openen.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); handleAdd() }}
        className="border rounded p-3 bg-white space-y-2"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube-link, bijv. https://www.youtube.com/watch?v=..."
          className="w-full p-2 border rounded text-sm"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel (optioneel)"
          className="w-full p-2 border rounded text-sm"
        />
        {url.trim() && !urlValid && <p className="text-xs text-red-600">Dit is geen YouTube-link.</p>}
        <button
          type="submit"
          disabled={!urlValid || saving}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {saving ? 'Opslaan...' : 'Toevoegen'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400 italic">Links laden...</p>}
      {!loading && links.length === 0 && !error && (
        <p className="text-sm text-gray-400">Nog geen links. Voeg hierboven een YouTube-link toe.</p>
      )}

      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.id} className="border rounded p-3 bg-white flex items-center gap-3">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 group"
            >
              <span className="block text-blue-600 group-hover:underline font-semibold truncate">
                ▶ {link.title || link.url}
              </span>
              <span className="block text-xs text-gray-400 truncate">
                {formatDutchDate(link.createdAt.slice(0, 10))}{link.title && ` · ${link.url}`}
              </span>
            </a>
            {deleteConfirmId === link.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => { await deleteLinkAsync(link.id); setDeleteConfirmId(null) }}
                  disabled={saving}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Verwijderen
                </button>
                <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:underline">
                  Annuleren
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirmId(link.id)}
                title="Verwijderen"
                className="text-gray-400 hover:text-red-600 shrink-0"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
