export type Tab = 'herschrijver' | 'vertaler' | 'fraselijst' | 'oefeningen' | 'quiz' | 'oefensessie' | 'cloze' | 'artikelen'

export interface QuizFile {
  id: string
  name: string
}

export interface QuizPair {
  dutch: string
  english: string
  // Set only for pairs built from Fraselijst (not a Drive quiz file) — lets
  // the quiz adjust that phrase's beheersing directly.
  phraseId?: string
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
  createdAt?: string
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

export interface ArticleItem {
  id: string
  name: string
  kind: 'folder' | 'article'
}

export interface ArticleFolder {
  id: string
  name: string
  items: ArticleItem[]
}

export interface Article {
  id: string
  name: string
  paragraphs: string[]
}
