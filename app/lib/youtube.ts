const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'https:' || url.protocol === 'http:') && YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

// Compact "where I left off" input: the last two digits are seconds, the rest
// minutes, e.g. "1723" → 17:23 → 1043. Seconds over 59 carry over ("5994" → 60:34).
export function parseCompactTimestamp(value: string): number | null {
  const digits = value.trim()
  if (!/^\d{1,6}$/.test(digits)) return null
  const minutes = Number(digits.slice(0, -2) || '0')
  const seconds = Number(digits.slice(-2))
  return minutes * 60 + seconds
}

export function formatCompactTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes === 0 ? String(seconds) : `${minutes}${String(seconds).padStart(2, '0')}`
}

export function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

export function withStartTime(value: string, seconds: number | null | undefined): string {
  if (!seconds) return value
  try {
    const url = new URL(value)
    url.searchParams.set('t', `${seconds}s`)
    return url.toString()
  } catch {
    return value
  }
}
