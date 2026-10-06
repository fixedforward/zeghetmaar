import type { WordEntry } from '../types'

export interface ClozeQuestion {
  phraseId: string
  word: string
  translation: string
  sentence: string
}

function wordIndex(sentence: string, word: string): number {
  return sentence.toLowerCase().indexOf(word.toLowerCase())
}

export function maskWord(sentence: string, word: string): string {
  const index = wordIndex(sentence, word)
  if (index === -1) return sentence
  return `${sentence.slice(0, index)}____${sentence.slice(index + word.length)}`
}

// Only phrases with an example sentence that actually contains the target
// word can become a cloze question — otherwise there's nothing to blank out.
// One question per phrase, from the first meaning with a matching example, so
// the shown translation always matches the sentence it came from.
export function buildClozeQuestions(words: WordEntry[]): ClozeQuestion[] {
  const questions: ClozeQuestion[] = []
  for (const w of words) {
    for (const meaning of w.meanings) {
      const example = meaning.examples.find(e => wordIndex(e, w.word) !== -1)
      if (!example) continue
      questions.push({ phraseId: w.id, word: w.word, translation: meaning.translation, sentence: example })
      break
    }
  }
  return questions
}

// Anki-style cards: the phrase on the front, all its meanings on the back. Unlike
// a cloze question, any phrase with a meaning qualifies — no example needed.
export function buildFlashcards(words: WordEntry[]): ClozeQuestion[] {
  return words
    .filter(w => w.meanings.length > 0)
    .map(w => ({
      phraseId: w.id,
      word: w.word,
      translation: w.meanings.map(m => m.translation).join(' · '),
      sentence: w.meanings.flatMap(m => m.examples)[0] ?? '',
    }))
}
