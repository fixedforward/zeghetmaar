export type PageItem = number | 'ellipsis'

// Windowed page list with ellipses on either side, e.g. for page 7 of 20:
// [1, 'ellipsis', 6, 7, 8, 'ellipsis', 20] — a fixed, small number of items
// (at most 2*siblingCount + 5) so the pagination bar never overflows on a
// narrow/mobile screen, unlike listing every page.
export function buildPageList(current: number, total: number, siblingCount = 1): PageItem[] {
  const range = (start: number, end: number): number[] =>
    Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i)

  const totalPageNumbers = siblingCount * 2 + 5

  if (total <= totalPageNumbers) {
    return range(1, total)
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1)
  const rightSiblingIndex = Math.min(current + siblingCount, total)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2
    return [...range(1, leftItemCount), 'ellipsis', total]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2
    return [1, 'ellipsis', ...range(total - rightItemCount + 1, total)]
  }

  return [1, 'ellipsis', ...range(leftSiblingIndex, rightSiblingIndex), 'ellipsis', total]
}
