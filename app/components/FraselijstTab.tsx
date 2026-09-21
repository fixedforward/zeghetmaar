import { useEffect, useState } from 'react'
import type { useWords } from '../hooks/useWords'
import type { WordEntry } from '../types'
import { buildChatGptExplainUrl, openChatGptInBackground } from '../lib/chatgpt'
import { buildPageList } from '../lib/pagination'
import { PhraseDetailModal } from './PhraseDetailModal'
import { TagsSelect } from './TagsSelect'
import { TagsManageModal } from './TagsManageModal'

type Props = ReturnType<typeof useWords> & { isLoggedIn: boolean; onPractice: (entry: WordEntry) => void }
type SortKey = 'updatedAt' | 'lastPracticedAt' | 'isFavorite' | 'beheersing'

const PAGE_SIZE = 10

export function FraselijstTab(words: Props) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('beheersing')
  const [sortAsc, setSortAsc] = useState(true)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)

  const allTags = [...new Set(words.words.flatMap(w => w.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  )

  useEffect(() => {
    if (activeTag && !allTags.includes(activeTag)) setActiveTag(null)
  }, [activeTag, allTags])

  const sortLabels: Record<SortKey, string> = {
    updatedAt: 'Bijgewerkt',
    lastPracticedAt: 'Laatst geoefend',
    isFavorite: 'Favoriet',
    beheersing: 'Beheersing',
  }

  const filteredWords = activeTag ? words.words.filter(w => w.tags?.includes(activeTag)) : words.words

  const trimmedSearch = search.trim().toLowerCase()
  const searchedWords = trimmedSearch
    ? filteredWords.filter(w =>
        w.word.toLowerCase().includes(trimmedSearch) || w.translation.toLowerCase().includes(trimmedSearch)
      )
    : filteredWords

  const sortedWords = [...searchedWords].sort((a, b) => {
    let result: number
    if (sortKey === 'isFavorite') {
      result = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
    } else if (sortKey === 'beheersing') {
      result = (b.beheersing ?? 0) - (a.beheersing ?? 0)
    } else {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (!aVal && !bVal) return 0
      if (!aVal) return 1
      if (!bVal) return -1
      result = new Date(bVal).getTime() - new Date(aVal).getTime()
    }
    return sortAsc ? -result : result
  })

  const totalPages = Math.max(1, Math.ceil(sortedWords.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageWords = sortedWords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Opgeslagen woorden en zinnen met vertaling en voorbeeldgebruik.
        </p>
        {words.isLoggedIn && (
          <button
            onClick={() => words.setShowAddForm(!words.showAddForm)}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
          >
            {words.showAddForm ? '✕ Sluiten' : '+ Frase toevoegen'}
          </button>
        )}
      </div>

      {words.showAddForm && (
        <div className="border rounded p-4 bg-gray-50 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frase</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={words.newWord}
                onChange={(e) => words.setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && words.handleAddWord()}
                placeholder="bijv. gele koorts komt niet voor in Amerika"
                className="flex-1 p-2 border rounded"
              />
              {words.newWord && (
                <button
                  onClick={() => words.setNewWord('')}
                  className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
                  title="Wissen"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={words.newTranslation}
                onChange={(e) => words.setNewTranslation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && words.handleAddWord()}
                placeholder="bijv. yellow fever does not occur in America"
                className="flex-1 p-2 border rounded"
              />
              {words.newTranslation && (
                <button
                  onClick={() => words.setNewTranslation('')}
                  className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
                  title="Wissen"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => words.generateAiTranslation(words.newWord, 'add')}
                disabled={words.aiTranslationLoading || !words.newWord.trim()}
                className="text-sm text-purple-600 hover:underline disabled:opacity-50 shrink-0"
              >
                {words.aiTranslationLoading ? 'Vertalen...' : 'AI vertaling'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
            {words.newExamples.map((ex, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <textarea
                  ref={(el) => {
                    if (!el) return
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  value={ex}
                  onChange={(e) => {
                    const updated = [...words.newExamples]
                    updated[i] = e.target.value
                    words.setNewExamples(updated)
                  }}
                  placeholder="Dutch sentence — English translation"
                  rows={2}
                  className="flex-1 p-2 border rounded text-sm resize-none overflow-hidden"
                />
                <button
                  onClick={() => words.setNewExamples(words.newExamples.filter((_, j) => j !== i))}
                  className="text-red-500 hover:text-red-700 text-sm px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => words.setNewExamples([...words.newExamples, ''])}
              className="text-sm text-blue-600 hover:underline"
            >
              + Voorbeeld toevoegen
            </button>
            <button
              onClick={() => words.generateAiExamples(words.newWord, 'add')}
              disabled={words.aiExamplesLoading || !words.newWord.trim()}
              className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
            >
              {words.aiExamplesLoading ? 'Genereren...' : 'AI voorbeelden'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <TagsSelect allTags={allTags} selected={words.newTags} onChange={words.setNewTags} />
          </div>

          {words.addError && <p className="text-sm text-red-600">{words.addError}</p>}
          <button
            onClick={words.handleAddWord}
            disabled={words.addLoading || !words.newWord.trim() || !words.newTranslation.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {words.addLoading ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Zoeken op woord of vertaling..."
            className="w-full p-1.5 pr-7 text-sm border rounded"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              title="Wissen"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setSortAsc(a => !a)}
          title={sortAsc ? 'Oplopend' : 'Aflopend'}
          className="px-2 py-1 text-xs rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
        >
          {sortAsc ? '↑' : '↓'}
        </button>
      <div className="relative inline-block">
        <button
          onClick={() => setSortDropdownOpen(o => !o)}
          className="px-3 py-1 text-xs rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-100 flex items-center gap-1"
        >
          Sorteer op: {sortLabels[sortKey]} ▾
        </button>
        {sortDropdownOpen && (
          <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded shadow-md min-w-max">
            {(Object.keys(sortLabels) as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => { setSortKey(key); setPage(1); setSortDropdownOpen(false) }}
                className={[
                  'block w-full text-left px-4 py-2 text-xs hover:bg-gray-100',
                  sortKey === key ? 'font-semibold text-blue-600' : 'text-gray-700',
                ].join(' ')}
              >
                {sortLabels[key]}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Tags:</span>
          <button
            onClick={() => { setActiveTag(null); setPage(1) }}
            className={[
              'text-xs px-2 py-0.5 rounded border',
              activeTag === null
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
            ].join(' ')}
          >
            Alle
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => { setActiveTag(tag); setPage(1) }}
              className={[
                'text-xs px-2 py-0.5 rounded border',
                activeTag === tag
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
              ].join(' ')}
            >
              {tag}
            </button>
          ))}
          {words.isLoggedIn && (
            <button
              onClick={() => setManageTagsOpen(true)}
              className="text-xs text-blue-600 hover:underline ml-1"
            >
              ⚙ Beheren
            </button>
          )}
        </div>
      )}

      {manageTagsOpen && (
        <TagsManageModal
          allTags={allTags}
          onClose={() => setManageTagsOpen(false)}
          onReload={() => words.loadWords(true)}
        />
      )}

      {words.wordsLoading && <p className="text-sm text-gray-400 italic">Laden...</p>}
      {words.wordsError && <p className="text-sm text-red-600">{words.wordsError}</p>}
      {!words.wordsLoading && !words.wordsError && words.words.length === 0 && (
        <p className="text-sm text-gray-400">Geen frasen gevonden.</p>
      )}
      {!words.wordsLoading && !words.wordsError && words.words.length > 0 && filteredWords.length === 0 && (
        <p className="text-sm text-gray-400">Geen frasen met deze tag.</p>
      )}
      {!words.wordsLoading && !words.wordsError && filteredWords.length > 0 && searchedWords.length === 0 && (
        <p className="text-sm text-gray-400">Geen frasen gevonden voor &quot;{search}&quot;.</p>
      )}

      <ul className="space-y-2">
        {pageWords.map(entry => (
          <li key={entry.id} className="border rounded p-3 bg-white">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <button
                  onClick={() => words.startEdit(entry)}
                  className="font-semibold text-gray-900 hover:text-blue-600 hover:underline text-left"
                  title={entry.translation}
                >
                  {entry.word}
                </button>
                {entry.beheersing && (
                  <span
                    title={`Beheersing ${entry.beheersing}`}
                    className={[
                      'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white shrink-0',
                      entry.beheersing === 1 ? 'bg-red-400' : entry.beheersing === 2 ? 'bg-yellow-400' : 'bg-green-500',
                    ].join(' ')}
                  >
                    {entry.beheersing}
                  </span>
                )}
                {entry.tags?.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setActiveTag(tag); setPage(1) }}
                    className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => words.onPractice(entry)}
                  className="text-xs text-purple-600 hover:underline"
                >
                  Oefenen
                </button>
                <button
                  onClick={() => openChatGptInBackground(buildChatGptExplainUrl(entry.word))}
                  className="text-xs text-green-600 hover:underline"
                >
                  Meer info
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <PhraseDetailModal {...words} />

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ‹
          </button>
          {buildPageList(safePage, totalPages).map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={`px-3 py-1 text-sm border rounded ${item === safePage ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                {item}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
