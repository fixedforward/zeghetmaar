// Keeps the existing options first and leaves out exact (case-insensitive) duplicates.
export function mergeIslandOptions(existing: string[], added: string[]): string[] {
  const merged: string[] = []
  for (const option of [...existing, ...added]) {
    const text = option.trim()
    if (text && !merged.some(m => m.toLowerCase() === text.toLowerCase())) merged.push(text)
  }
  return merged
}

// Case-insensitive match on the English phrase or any of its Dutch options; an empty query keeps all.
export function filterIslands<T extends { english: string; options: string[] }>(islands: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return islands
  return islands.filter(i => i.english.toLowerCase().includes(q) || i.options.some(o => o.toLowerCase().includes(q)))
}
