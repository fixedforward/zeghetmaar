// The value as an http(s) URL, or null when it isn't one.
export function parseWebUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}
