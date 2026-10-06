import { useCallback, useEffect, useState } from 'react'
import type { useLuisteren } from '../hooks/useLuisteren'
import type { useWords } from '../hooks/useWords'
import { formatDutchDate } from '../lib/date'
import { formatClock, formatCompactTimestamp, isYouTubeUrl, parseCompactTimestamp, startBefore, withStartTime } from '../lib/youtube'
import { AddPhraseModal } from './AddPhraseModal'
import { oppositeHalfOfScreen, openPopupWindow } from '../lib/popup'

const PHRASE_LEAD_SECONDS = 5

type Props = ReturnType<typeof useLuisteren> & {
  isLoggedIn: boolean
  words: ReturnType<typeof useWords>
}

export function LuisterenTab({
  links, loading, saving, error, loadLinks, addLinkAsync, setPositionAsync,
  addPhraseAsync, setPhraseSecondsAsync, deletePhraseAsync, markPhraseImportedAsync, deleteLinkAsync, isLoggedIn, words,
}: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Unsaved text of the compact time fields, keyed by link id (where you left
  // off), phrase id (when the phrase was said) or `new:<link id>` (add form).
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({})
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

  const timeText = (key: string, saved?: number) =>
    timeDrafts[key] ?? (saved ? formatCompactTimestamp(saved) : '')

  // An empty field means no time (null); an unparseable one is undefined and stays as a draft.
  const draftTime = (key: string, saved?: number): number | null | undefined => {
    const text = timeText(key, saved).trim()
    return text ? parseCompactTimestamp(text) ?? undefined : null
  }

  const clearTimeDraft = (key: string) => setTimeDrafts(({ [key]: _, ...rest }) => rest)

  const commitTime = async (key: string, saved: number | undefined, saveAsync: (seconds: number | null) => Promise<boolean>) => {
    if (!(key in timeDrafts)) return
    const seconds = draftTime(key, saved)
    if (seconds === undefined) return
    if (seconds !== (saved ?? null) && !(await saveAsync(seconds))) return
    clearTimeDraft(key)
  }

  const timeInput = (key: string, saved: number | undefined, onCommit?: () => void, className = 'w-20') => (
    <input
      type="text"
      inputMode="numeric"
      value={timeText(key, saved)}
      onChange={(e) => setTimeDrafts(prev => ({ ...prev, [key]: e.target.value }))}
      onBlur={onCommit}
      onKeyDown={onCommit && ((e) => { if (e.key === 'Enter') onCommit() })}
      placeholder="mmss"
      title={draftTime(key, saved) ? formatClock(draftTime(key, saved)!) : 'Tijd als mmss, bijv. 1723 = 17:23'}
      className={`${className} p-1 border rounded text-sm text-right ${draftTime(key, saved) === undefined ? 'border-red-400' : ''}`}
    />
  )

  const openVideo = (url: string, seconds: number | null | undefined) =>
    openPopupWindow(withStartTime(url, seconds), 'luisteren-video', oppositeHalfOfScreen())

  const phraseJumpButton = (url: string, said: number | null | undefined) => {
    const start = said ? startBefore(said, PHRASE_LEAD_SECONDS) : null
    return (
      <button
        onClick={() => openVideo(url, start)}
        disabled={!said}
        title={start !== null ? `Open de video op ${formatClock(start)} (${PHRASE_LEAD_SECONDS} s ervoor)` : 'Vul eerst de tijd in'}
        className="text-blue-600 hover:text-blue-800 disabled:text-gray-300 shrink-0"
      >
        ▶
      </button>
    )
  }

  const togglePhrases = (linkId: string) => setOpenPhrasesIds(prev => {
    const next = new Set(prev)
    if (next.has(linkId)) next.delete(linkId)
    else next.add(linkId)
    return next
  })

  const handleAddPhrase = async (linkId: string) => {
    const text = (phraseInputs[linkId] ?? '').trim()
    const seconds = draftTime(`new:${linkId}`)
    if (!text || seconds === undefined || saving) return
    if (await addPhraseAsync(linkId, text, seconds)) {
      setPhraseInputs(prev => ({ ...prev, [linkId]: '' }))
      clearTimeDraft(`new:${linkId}`)
    }
  }

  const startImport = (linkId: string, phraseId: string, text: string) => {
    words.loadWords()
    words.startAddWord(text)
    setImporting({ linkId, phraseId })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-blue-800 bg-blue-50 border border-blue-100 rounded p-2">
        🎧 Doel: luister elke dag minstens 5 minuten naar een YouTube-video.
      </p>
      <p className="text-sm text-gray-500">Bewaar YouTube-video&apos;s om naar te luisteren. Klik op een link om de video in een apart venster op de andere helft van je scherm te openen; vul ernaast in waar je gebleven bent (bijv. 1723 = 17:23) om daar verder te kijken.</p>

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
          const seconds = draftTime(link.id, link.positionSeconds)
          const phrases = link.phrases ?? []
          return (
            <li key={link.id} className="border rounded p-3 bg-white space-y-2">
              <div className="flex items-center gap-3">
                <a
                  href={withStartTime(link.url, seconds)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault()
                    openVideo(link.url, seconds)
                  }}
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
                  {timeInput(link.id, link.positionSeconds, () => commitTime(link.id, link.positionSeconds, s => setPositionAsync(link.id, s)))}
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
                          {timeInput(
                            phrase.id,
                            phrase.seconds,
                            () => commitTime(phrase.id, phrase.seconds, s => setPhraseSecondsAsync(link.id, phrase.id, s)),
                            'w-16 shrink-0',
                          )}
                          {phraseJumpButton(link.url, draftTime(phrase.id, phrase.seconds))}
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
                    {timeInput(`new:${link.id}`, undefined, undefined, 'w-16 shrink-0')}
                    <button
                      type="submit"
                      disabled={!(phraseInputs[link.id] ?? '').trim() || draftTime(`new:${link.id}`) === undefined || saving}
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
