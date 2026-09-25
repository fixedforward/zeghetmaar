export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Weighted pick-without-replacement: gives each item a random key scaled
// inversely by its weight, then sorts ascending, so a higher weight means a
// smaller expected key and a better chance of landing near the front — while
// every item, even weight-1 ones, can still end up anywhere.
export function weightedShuffleArray<T>(items: T[], weightOf: (item: T) => number): T[] {
  return items
    .map(item => ({ item, key: -Math.log(Math.random()) / weightOf(item) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item)
}
