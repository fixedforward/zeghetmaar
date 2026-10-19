// Which sentences were practiced on one day; the counter starts at 0 again the next day.
export interface PracticedToday {
  date: string
  sentences: string[]
}

export function parsePracticedToday(raw: string | null): PracticedToday | null {
  try {
    const parsed = JSON.parse(raw ?? '')
    if (typeof parsed?.date !== 'string' || !Array.isArray(parsed.sentences)) return null
    return { date: parsed.date, sentences: parsed.sentences.filter((s: unknown): s is string => typeof s === 'string') }
  } catch {
    return null
  }
}

export function countPracticedOn(practiced: PracticedToday | null, today: string): number {
  return practiced?.date === today ? practiced.sentences.length : 0
}

// A sentence that comes back later in the session is counted once.
export function addPracticedSentence(practiced: PracticedToday | null, today: string, sentence: string): PracticedToday {
  const sentences = practiced?.date === today ? practiced.sentences : []
  return { date: today, sentences: sentences.includes(sentence) ? sentences : [...sentences, sentence] }
}
