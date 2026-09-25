export type Tab = 'herschrijver' | 'vertaler' | 'fraselijst' | 'oefeningen' | 'quiz' | 'oefensessie' | 'cloze'

export interface QuizFile {
  id: string
  name: string
}

export interface QuizPair {
  dutch: string
  english: string
}

export interface Meaning {
  translation: string
  examples: string[]
}

export interface WordEntry {
  id: string
  word: string
  meanings: Meaning[]
  tags?: string[]
  beheersing?: 1 | 2 | 3
  lastPracticedAt?: string
  isFavorite?: boolean
  updatedAt: string
}

export interface Exercise {
  id: string
  name: string
  url: string
}

export interface SelectionPopup {
  x: number
  y: number
  text: string
  explanation: string | null
  loading: boolean
}

export interface Phrase {
  id: string
  word: string
  normalizedWord: string
  meanings: Meaning[]
  tags?: string[]
  beheersing?: 1 | 2 | 3
  lastPracticedAt?: string
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
}
