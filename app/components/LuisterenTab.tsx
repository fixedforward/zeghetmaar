import { useCallback, useEffect, useState } from 'react'
import type { useLuisteren } from '../hooks/useLuisteren'
import type { useWords } from '../hooks/useWords'
import type { ListeningLink } from '../types'
import { formatDutchDate } from '../lib/date'
import { formatClock, formatCompactTimestamp, isYouTubeUrl, parseCompactTimestamp, withStartTime } from '../lib/youtube'
import { AddPhraseModal } from './AddPhraseModal'

type Props = ReturnType<typeof useLuisteren> & {
  isLoggedIn: boolean
  words: ReturnType<typeof useWords>
}

export function LuisterenTab({
  links, loading, saving, error, loadLinks, addLinkAsync, setPositionAsync,
  addPhraseAsync, deletePhraseAsync, markPhraseImportedAsync, deleteLinkAsync, isLoggedIn, words,
}: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [positionDrafts, setPositionDrafts] = useState<Record<string, string>>({})
  const [openPhrasesIds, setOpenPhrasesIds] = useState<Set<string>>(new Set())
  const [phraseInputs, setPhraseInputs] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState<{ linkId: string; phraseId: string } | null>(null)
  const closeImport = useCallback(() => setImporting(null), [])

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

  const positionText = (link: ListeningLink) =>
    positionDrafts[link.id] ?? (link.positionSeconds ? formatCompactTimestamp(link.positionSeconds) : '')

  // An empty field clears the position; an unparseable one stays as a draft.
  const draftSeconds = (link: ListeningLink): number | null | undefined => {
    const text = positionText(link).trim()
    return text ? parseCompactTimestamp(text) ?? undefined : null
  }

  const commitPosition = async (link: ListeningLink) => {
    if (!(link.id in positionDrafts)) return
    const seconds = draftSeconds(link)
    if (seconds === undefined) return
    if (seconds !== (link.positionSeconds ?? null) && !(await setPositionAsync(link.id, seconds))) return
    setPositionDrafts(({ [link.id]: _, ...rest }) => rest)
  }

  const togglePhrases = (linkId: string) => setOpenPhrasesIds(prev => {
    const next = new Set(prev)
    if (next.has(linkId)) next.delete(linkId)
    else next.add(linkId)
    return next
  })

  const handleAddPhrase = async (linkId: string) => {
    const text = (phraseInputs[linkId] ?? '').trim()
    if (!text || saving) return
    if (await addPhraseAsync(linkId, text)) setPhraseInputs(prev => ({ ...prev, [linkId]: '' }))
  }

  const startImport = (linkId: string, phraseId: string, text: string) => {
    words.loadWords()
    words.startAddWord(text)
    setImporting({ linkId, phraseId })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Bewaar YouTube-video&apos;s om naar te luisteren. Klik op een link om de video te openen; vul ernaast in waar je gebleven bent (bijv. 1723 = 17:23) om daar verder te kijken.</p>

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
        {links.map((link) => {
          const seconds = draftSeconds(link)
          const phrases = link.phrases ?? []
          return (
            <li key={link.id} className="border rounded p-3 bg-white space-y-2">
              <div className="flex items-center gap-3">
                <a
                  href={withStartTime(link.url, seconds)}
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
                <div className="flex flex-col items-end shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={positionText(link)}
                    onChange={(e) => setPositionDrafts(prev => ({ ...prev, [link.id]: e.target.value }))}
                    onBlur={() => commitPosition(link)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitPosition(link) }}
                    placeholder="mmss"
                    title="Waar je gebleven bent, bijv. 1723 = 17:23"
                    className={`w-20 p-1 border rounded text-sm text-right ${seconds === undefined ? 'border-red-400' : ''}`}
                  />
                  {!!seconds && <span className="text-xs text-gray-400">{formatClock(seconds)}</span>}
                </div>
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
              </div>
              <button
                type="button"
                onClick={() => togglePhrases(link.id)}
                className="text-xs text-blue-600 hover:underline"
              >
                {openPhrasesIds.has(link.id) ? '▾' : '▸'} Woorden ({phrases.length})
              </button>
              {openPhrasesIds.has(link.id) && (
                <div className="space-y-2 pl-3 border-l-2 border-gray-100">
                  {phrases.length > 0 && (
                    <ul className="space-y-1">
                      {phrases.map(phrase => (
                        <li key={phrase.id} className="flex items-center gap-2 text-sm">
                          <span className={`flex-1 min-w-0 ${phrase.imported ? 'text-gray-400' : 'text-gray-800'}`}>{phrase.text}</span>
                          {phrase.imported ? (
                            <span className="text-xs text-green-600 shrink-0">✓ In fraselijst</span>
                          ) : (
                            <button
                              onClick={() => startImport(link.id, phrase.id, phrase.text)}
                              className="text-xs text-blue-600 hover:underline shrink-0"
                            >
                              + Fraselijst
                            </button>
                          )}
                          <button
                            onClick={() => deletePhraseAsync(link.id, phrase.id)}
                            disabled={saving}
                            title="Verwijderen"
                            className="text-gray-400 hover:text-red-600 disabled:opacity-50 shrink-0"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleAddPhrase(link.id) }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={phraseInputs[link.id] ?? ''}
                      onChange={(e) => setPhraseInputs(prev => ({ ...prev, [link.id]: e.target.value }))}
                      placeholder="Woord of frase uit deze video"
                      className="flex-1 min-w-0 p-1.5 border rounded text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!(phraseInputs[link.id] ?? '').trim() || saving}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                    >
                      Toevoegen
                    </button>
                  </form>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <AddPhraseModal
        words={words}
        open={!!importing}
        onClose={closeImport}
        onAdded={() => { if (importing) markPhraseImportedAsync(importing.linkId, importing.phraseId) }}
      />
    </div>
  )
}
