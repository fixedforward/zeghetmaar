import type { Note } from '../types'

// The title, or the note's first line when it has no title.
export function noteHeading(note: Note): string {
  return note.title || note.text.split('\n')[0]
}

export function filterNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase()
  if (!q) return notes
  return notes.filter(n => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
}
