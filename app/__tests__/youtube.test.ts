import { describe, it, expect } from 'vitest'
import { isYouTubeUrl } from '../lib/youtube'

describe('isYouTubeUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    '  https://youtube.com/shorts/abc  ',
  ])('accepts %s', (url) => {
    expect(isYouTubeUrl(url)).toBe(true)
  })

  it.each([
    'https://vimeo.com/123',
    'https://youtube.com.evil.example/watch?v=1',
    'javascript:alert(1)',
    'niet een url',
    '',
  ])('rejects %s', (url) => {
    expect(isYouTubeUrl(url)).toBe(false)
  })
})
