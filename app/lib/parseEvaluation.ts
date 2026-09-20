export function parseEvaluation(text: string): { evaluatie: string; suggestie: string } | null {
  const match = text.match(/Evaluatie:\s*([\s\S]*?)\nSuggestie:\s*([\s\S]*)/)
  if (!match) return null
  return { evaluatie: match[1].trim(), suggestie: match[2].trim() }
}
