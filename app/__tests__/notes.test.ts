import { describe, it, expect } from 'vitest'
import { filterNotes, noteHeading } from '../lib/notes'

const note = (title: string, text: string) => ({ id: title + text, title, text, createdAt: '', updatedAt: '' })

describe('noteHeading', () => {
  it('uses the title, or the first line of the text when there is no title', () => {
    expect(noteHeading(note('Grammatica', 'regel 1\nregel 2'))).toBe('Grammatica')
    expect(noteHeading(note('', 'regel 1\nregel 2'))).toBe('regel 1')
  })
})

describe('filterNotes', () => {
  const notes = [note('Grammatica', 'om te'), note('Woorden', 'Gezellig')]

  it('matches the title or the text, ignoring case', () => {
    expect(filterNotes(notes, 'gramm')).toEqual([notes[0]])
    expect(filterNotes(notes, 'GEZELLIG')).toEqual([notes[1]])
  })

  it('returns every note for an empty query', () => {
    expect(filterNotes(notes, '  ')).toEqual(notes)
  })
})
