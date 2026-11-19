import type { Note } from '../types'
import { useDriveList } from './useDriveList'

export function useNotes() {
  const { items: notes, loading, saving, error, load: loadNotes, saveAsync } =
    useDriveList<Note>('/api/notes', 'notes', '[useNotes]', 'Kon notities niet laden.')

  const addNoteAsync = (title: string, text: string) => saveAsync('POST', { title, text }, 'Kon notitie niet opslaan.')
  const setTitleAsync = (id: string, title: string) => saveAsync('PUT', { id, title }, 'Kon titel niet opslaan.')
  const setTextAsync = (id: string, text: string) => saveAsync('PUT', { id, text }, 'Kon notitie niet opslaan.')
  const deleteNoteAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon notitie niet verwijderen.')

  return { notes, loading, saving, error, loadNotes, addNoteAsync, setTitleAsync, setTextAsync, deleteNoteAsync }
}
