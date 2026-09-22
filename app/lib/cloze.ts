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
export function buildClozeQuestions(words: WordEntry[]): ClozeQuestion[] {
  const questions: ClozeQuestion[] = []
  for (const w of words) {
    const example = w.examples.find(e => wordIndex(e, w.word) !== -1)
    if (!example) continue
    questions.push({ phraseId: w.id, word: w.word, translation: w.translation, sentence: example })
  }
  return questions
}
