export function getAllTags(entries: { tags?: string[] }[]): string[] {
  return [...new Set(entries.flatMap((e) => e.tags ?? []))].sort((a, b) => a.localeCompare(b))
}
