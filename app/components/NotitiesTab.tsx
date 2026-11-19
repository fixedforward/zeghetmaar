import { useEffect, useState } from 'react'
import type { Note } from '../types'
import type { useNotes } from '../hooks/useNotes'
import { filterNotes, noteHeading } from '../lib/notes'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { EditableText } from './EditableText'
import { SearchInput } from './SearchInput'

type Notes = ReturnType<typeof useNotes>

type Props = Notes & { isLoggedIn: boolean }

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

function NoteCard({ note, notes }: { note: Note; notes: Notes }) {
  return (
    <details className="border rounded bg-white">
      <summary className="cursor-pointer p-3 flex items-center justify-between gap-2">
        <span className="font-medium text-gray-800 truncate">{noteHeading(note)}</span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(note.updatedAt)}</span>
      </summary>
      <div className="px-3 pb-3 space-y-3 text-sm">
        <div>
          <span className="text-xs text-gray-400">Titel</span>
          <EditableText text={note.title} saving={notes.saving} onSave={text => notes.setTitleAsync(note.id, text)} textClassName="text-gray-800" />
        </div>
        <div>
          <span className="text-xs text-gray-400">Notitie</span>
          <EditableText text={note.text} saving={notes.saving} onSave={text => notes.setTextAsync(note.id, text)} textClassName="text-gray-800 whitespace-pre-wrap" multiline />
        </div>
        <div className="flex justify-end">
          <ConfirmDeleteButton onDelete={() => notes.deleteNoteAsync(note.id)} deleting={false} title="Notitie verwijderen" />
        </div>
      </div>
    </details>
  )
}

export function NotitiesTab({ isLoggedIn, ...notes }: Props) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const { loadNotes } = notes

  useEffect(() => {
    if (isLoggedIn) loadNotes()
  }, [isLoggedIn, loadNotes])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je notities te zien.</p>
  }

  const add = async () => {
    if (!text.trim()) return
    if (await notes.addNoteAsync(title.trim(), text.trim())) {
      setTitle('')
      setText('')
    }
  }

  const shownNotes = filterNotes(notes.notes, search)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel (optioneel)"
          className="w-full p-2 border rounded"
        />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }}
          placeholder="Schrijf een notitie... (⌘/Ctrl+Enter om op te slaan)"
          rows={4}
          className="w-full p-2 border rounded"
        />
        <button
          onClick={add}
          disabled={notes.saving || !text.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Opslaan
        </button>
      </div>
      {notes.error && <p className="text-sm text-red-500">{notes.error}</p>}
      {notes.loading && <p className="text-sm text-gray-400">Laden...</p>}
      {notes.notes.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Zoeken in titel of tekst..." />
      )}
      {!notes.loading && notes.notes.length === 0 && <p className="text-sm text-gray-400">Nog geen notities.</p>}
      {notes.notes.length > 0 && shownNotes.length === 0 && (
        <p className="text-sm text-gray-400">Geen notities gevonden voor &quot;{search}&quot;.</p>
      )}
      <div className="space-y-2">
        {shownNotes.map(note => <NoteCard key={note.id} note={note} notes={notes} />)}
      </div>
    </div>
  )
}
