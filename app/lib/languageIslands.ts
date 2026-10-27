// Keeps the existing options first and leaves out exact (case-insensitive) duplicates.
export function mergeIslandOptions(existing: string[], added: string[]): string[] {
  const merged: string[] = []
  for (const option of [...existing, ...added]) {
    const text = option.trim()
    if (text && !merged.some(m => m.toLowerCase() === text.toLowerCase())) merged.push(text)
  }
  return merged
}
