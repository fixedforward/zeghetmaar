// A wrong answer comes back a few cards later (2-5 others in between) instead of in a separate retry round.
export function randomRequeueGap(): number {
  return 2 + Math.floor(Math.random() * 4)
}

export function insertLater<T>(items: T[], afterIndex: number, gap: number, item: T): T[] {
  const insertAt = Math.min(afterIndex + 1 + gap, items.length)
  return [...items.slice(0, insertAt), item, ...items.slice(insertAt)]
}
