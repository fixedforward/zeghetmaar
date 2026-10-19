export type Tab = 'herschrijver' | 'vertaler' | 'fraselijst' | 'oefeningen' | 'quiz' | 'oefensessie' | 'cloze' | 'artikelen' | 'luisteren' | 'fouten'

// One row of the mistakes .tsv on Drive; `row` is its line index in the file (the header is 0).
export interface Mistake {
  row: number
  mistake: string
  correction: string
  type: string
  timesPracticed: number
  // English version of the sentence: the prompt for translation practice. Empty when the file has none.
  translation: string
  // A simpler or more natural way to say it than the plain correction. Empty when there is none.
  rewording: string
}

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
  // Drive file id of an image in the configured pictures folder.
  picture?: string
  createdAt?: string
  updatedAt: string
}

export interface ListeningLink {
  id: string
  title: string
  url: string
  createdAt: string
  positionSeconds?: number
  phrases?: ListeningPhrase[]
}

export interface ListeningPhrase {
  id: string
  text: string
  imported: boolean
  seconds?: number
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
  picture?: string
  createdAt: string
  updatedAt: string
}

export interface PictureFile {
  id: string
  name: string
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

export interface TranscriptCue {
  start: number
  end: number
  text: string
}

export interface ListeningLesson {
  id: string
  name: string
  mediaFileId: string
  isAudio?: boolean
  // The .srt that belongs to the media file: same name, same folder; its id is null when missing.
  subtitleFileName: string
  subtitleFileId: string | null
  cues: TranscriptCue[]
}

export interface ListeningTreeFile {
  id: string
  name: string
  hasSubtitles: boolean
}

export interface ListeningTreeFolder {
  id: string
  name: string
  folders: ListeningTreeFolder[]
  files: ListeningTreeFile[]
}
