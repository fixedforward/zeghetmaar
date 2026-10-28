import { useEffect, useState } from 'react'
import type { LanguageIsland } from '../types'
import type { useLanguageIslands } from '../hooks/useLanguageIslands'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { Pagination } from './Pagination'
import { SearchInput } from './SearchInput'
import { filterIslands } from '../lib/languageIslands'

type Islands = ReturnType<typeof useLanguageIslands>

const PAGE_SIZE = 10

type Props = Islands & {
  isLoggedIn: boolean
}

function EditableText({ text, saving, onSave, onDelete, textClassName }: {
  text: string
  saving: boolean
  onSave: (text: string) => Promise<unknown>
  onDelete?: () => void
  textClassName: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <div className="flex items-start justify-between gap-2 group">
        <span className={textClassName}>{text}</span>
        <span className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100">
          <button onClick={() => setDraft(text)} className="text-xs text-gray-500 hover:underline">Bewerken</button>
          {onDelete && <button onClick={onDelete} disabled={saving} title="Optie verwijderen" className="text-xs text-red-400 hover:text-red-600">✕</button>}
        </span>
      </div>
    )
  }

  const save = async () => {
    if (!draft.trim() || draft.trim() === text) return setDraft(null)
    await onSave(draft.trim())
    setDraft(null)
  }

  return (
    <div className="flex gap-2">
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }}
        autoFocus
        className="flex-1 border rounded px-2 py-1 text-sm"
      />
      <button onClick={save} disabled={saving} className="text-xs text-blue-600 hover:underline">Opslaan</button>
      <button onClick={() => setDraft(null)} className="text-xs text-gray-500 hover:underline">Annuleren</button>
    </div>
  )
}

function IslandCard({ island, islands }: { island: LanguageIsland; islands: Islands }) {
  const [newOption, setNewOption] = useState('')

  const addOption = async () => {
    if (!newOption.trim()) return
    if (await islands.addOptionAsync(island, newOption)) setNewOption('')
  }

  return (
    <details className="border rounded bg-white">
      <summary className="cursor-pointer p-3 flex items-center justify-between gap-2">
        <span className="font-medium text-gray-800">{island.english}</span>
        <span className="text-xs text-gray-400 shrink-0">{island.options.length} opties</span>
      </summary>
      <div className="px-3 pb-3 space-y-3">
        <div className="text-sm">
          <span className="text-xs text-gray-400">Engelse frase</span>
          <EditableText
            text={island.english}
            saving={islands.saving}
            onSave={text => islands.setEnglishAsync(island.id, text)}
            textClassName="text-gray-800"
          />
        </div>
        {island.options.length > 0
          ? (
            <ul className="space-y-1 text-sm">
              {island.options.map((option, i) => (
                <li key={`${i}-${option}`}>
                  <EditableText
                    text={option}
                    saving={islands.saving}
                    onSave={text => islands.setOptionsAsync(island.id, island.options.map((o, j) => j === i ? text : o))}
                    onDelete={() => islands.deleteOptionAsync(island, i)}
                    textClassName="text-green-700"
                  />
                </li>
              ))}
            </ul>
          )
          : <p className="text-sm text-gray-400">Nog geen opties.</p>}
        <div className="flex gap-2">
          <input
            value={newOption}
            onChange={e => setNewOption(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOption()}
            placeholder="Eigen optie toevoegen..."
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <button onClick={addOption} disabled={islands.saving || !newOption.trim()} className="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-50">
            Toevoegen
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => islands.askChatGpt(island)}
            className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            Vraag ChatGPT
          </button>
          <ConfirmDeleteButton onDelete={() => islands.deleteIslandAsync(island.id)} deleting={false} title="Taaleiland verwijderen" />
        </div>
      </div>
    </details>
  )
}

export function TaaleilandenTab({ isLoggedIn, ...islands }: Props) {
  const [english, setEnglish] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { loadIslands } = islands

  useEffect(() => {
    if (isLoggedIn) loadIslands()
  }, [isLoggedIn, loadIslands])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je taaleilanden te zien.</p>
  }

  const searchedIslands = filterIslands(islands.islands, search)
  const totalPages = Math.max(1, Math.ceil(searchedIslands.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageIslands = searchedIslands.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const add = async () => {
    if (!english.trim()) return
    if (await islands.addIslandAsync(english.trim())) setEnglish('')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Zet hier de frases die je het vaakst zegt, in het Engels. Klap er een open om je Nederlandse opties te zien, of vraag ChatGPT om meer.
      </p>
      <div className="flex gap-2">
        <input
          value={english}
          onChange={e => setEnglish(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Bijv. I usually work from home on Fridays"
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={add}
          disabled={islands.saving || !english.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>
      {islands.error && <p className="text-sm text-red-500">{islands.error}</p>}
      {islands.loading && <p className="text-sm text-gray-400">Laden...</p>}
      {islands.islands.length > 0 && (
        <SearchInput
          value={search}
          onChange={value => { setSearch(value); setPage(1) }}
          placeholder="Zoeken op Engelse frase of Nederlandse optie..."
        />
      )}
      {!islands.loading && islands.islands.length === 0 && <p className="text-sm text-gray-400">Nog geen taaleilanden.</p>}
      {islands.islands.length > 0 && searchedIslands.length === 0 && (
        <p className="text-sm text-gray-400">Geen taaleilanden gevonden voor &quot;{search}&quot;.</p>
      )}
      <div className="space-y-2">
        {pageIslands.map(island => <IslandCard key={island.id} island={island} islands={islands} />)}
      </div>
      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
