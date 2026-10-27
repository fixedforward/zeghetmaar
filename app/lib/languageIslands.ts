// Splits the AI's answer into one option per line, dropping numbering/bullets a model adds anyway.
export function parseIslandOptions(response: string): string[] {
  return response
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(line => line !== '')
}

// Keeps the existing options first and leaves out exact (case-insensitive) duplicates.
export function mergeIslandOptions(existing: string[], added: string[]): string[] {
  const merged: string[] = []
  for (const option of [...existing, ...added]) {
    const text = option.trim()
    if (text && !merged.some(m => m.toLowerCase() === text.toLowerCase())) merged.push(text)
  }
  return merged
}
