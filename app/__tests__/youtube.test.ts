import { describe, it, expect } from 'vitest'
import { formatClock, formatCompactTimestamp, isYouTubeUrl, parseCompactTimestamp, withStartTime } from '../lib/youtube'

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

describe('parseCompactTimestamp', () => {
  it.each([
    ['1723', 17 * 60 + 23],
    ['923', 9 * 60 + 23],
    ['811', 8 * 60 + 11],
    ['5994', 59 * 60 + 94],
    ['45', 45],
    ['0', 0],
    [' 1723 ', 17 * 60 + 23],
  ])('parses %s to %i seconds', (input, expected) => {
    expect(parseCompactTimestamp(input)).toBe(expected)
  })

  it.each(['', '17:23', '12a', '-5', '1234567'])('rejects %s', (input) => {
    expect(parseCompactTimestamp(input)).toBeNull()
  })
})

describe('formatCompactTimestamp', () => {
  it('formats seconds back to the compact form', () => {
    expect(formatCompactTimestamp(17 * 60 + 23)).toBe('1723')
    expect(formatCompactTimestamp(9 * 60 + 5)).toBe('905')
    expect(formatCompactTimestamp(45)).toBe('45')
  })
})

describe('formatClock', () => {
  it('formats as m:ss, or h:mm:ss from an hour on', () => {
    expect(formatClock(17 * 60 + 23)).toBe('17:23')
    expect(formatClock(59 * 60 + 94)).toBe('1:00:34')
  })
})

describe('withStartTime', () => {
  it('adds the t parameter to watch and youtu.be links', () => {
    expect(withStartTime('https://www.youtube.com/watch?v=abc', 1043)).toBe('https://www.youtube.com/watch?v=abc&t=1043s')
    expect(withStartTime('https://youtu.be/abc', 1043)).toBe('https://youtu.be/abc?t=1043s')
  })

  it('replaces an existing t parameter', () => {
    expect(withStartTime('https://youtu.be/abc?t=10', 60)).toBe('https://youtu.be/abc?t=60s')
  })

  it.each([0, null, undefined])('leaves the url unchanged for %s', (seconds) => {
    expect(withStartTime('https://youtu.be/abc', seconds)).toBe('https://youtu.be/abc')
  })
})
