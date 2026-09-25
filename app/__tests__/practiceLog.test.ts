import { describe, it, expect } from 'vitest'
import {
  isValidIsoDate,
  isoDateToYearDay,
  yearDayToIsoDate,
  encodeYearBitmap,
  decodeYearBitmap,
  propertyKeyForYear,
  yearFromPropertyKey,
  computeFullStreak,
} from '../lib/practiceLog'

describe('isValidIsoDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidIsoDate('2026-09-19')).toBe(true)
  })

  it('rejects other formats', () => {
    expect(isValidIsoDate('19-09-2026')).toBe(false)
    expect(isValidIsoDate('2026/09/19')).toBe(false)
    expect(isValidIsoDate('not a date')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
  })
})

describe('isoDateToYearDay / yearDayToIsoDate', () => {
  it('round-trips Jan 1st as day 0', () => {
    expect(isoDateToYearDay('2026-01-01')).toEqual({ year: 2026, day: 0 })
    expect(yearDayToIsoDate(2026, 0)).toBe('2026-01-01')
  })

  it('round-trips an arbitrary date', () => {
    const { year, day } = isoDateToYearDay('2026-09-19')
    expect(year).toBe(2026)
    expect(yearDayToIsoDate(year, day)).toBe('2026-09-19')
  })

  it('round-trips Dec 31st in a leap year', () => {
    const { year, day } = isoDateToYearDay('2028-12-31')
    expect(day).toBe(365) // leap year has a day 365 (366 days total)
    expect(yearDayToIsoDate(year, day)).toBe('2028-12-31')
  })

  it('throws on an invalid date string', () => {
    expect(() => isoDateToYearDay('not-a-date')).toThrow()
  })
})

describe('encodeYearBitmap / decodeYearBitmap', () => {
  it('round-trips a set of days', () => {
    const days = new Set([0, 1, 42, 200, 365])
    expect(decodeYearBitmap(encodeYearBitmap(days))).toEqual(days)
  })

  it('round-trips an empty set', () => {
    expect(decodeYearBitmap(encodeYearBitmap([]))).toEqual(new Set())
  })

  it('ignores out-of-range days when encoding', () => {
    const encoded = encodeYearBitmap([-1, 400, 5])
    expect(decodeYearBitmap(encoded)).toEqual(new Set([5]))
  })

  it('produces a base64 string within Drive\'s 124-byte appProperties limit', () => {
    const allDaysOfYear = Array.from({ length: 366 }, (_, i) => i)
    const encoded = encodeYearBitmap(allDaysOfYear)
    expect(encoded.length).toBeLessThan(124)
  })
})

describe('propertyKeyForYear / yearFromPropertyKey', () => {
  it('round-trips a year for a given log type', () => {
    expect(yearFromPropertyKey('quiz', propertyKeyForYear('quiz', 2026))).toBe(2026)
  })

  it('keeps different log types in separate namespaces', () => {
    const oefensessieKey = propertyKeyForYear('oefensessie', 2026)
    const quizKey = propertyKeyForYear('quiz', 2026)

    expect(oefensessieKey).not.toBe(quizKey)
    expect(yearFromPropertyKey('quiz', oefensessieKey)).toBeNull()
    expect(yearFromPropertyKey('oefensessie', quizKey)).toBeNull()
  })

  it('returns null for keys that are not a practice-log property', () => {
    expect(yearFromPropertyKey('quiz', 'unrelated_key')).toBeNull()
    expect(yearFromPropertyKey('quiz', 'practice_quiz_not_a_year')).toBeNull()
  })
})

describe('computeFullStreak', () => {
  it('returns 0 for no date sets', () => {
    expect(computeFullStreak([], '2026-09-24')).toBe(0)
  })

  it('returns 0 when today is missing from any set', () => {
    const a = new Set(['2026-09-23'])
    const b = new Set(['2026-09-23', '2026-09-24'])
    expect(computeFullStreak([a, b], '2026-09-24')).toBe(0)
  })

  it('counts consecutive days present in every set, stopping at the first gap', () => {
    const a = new Set(['2026-09-22', '2026-09-23', '2026-09-24'])
    const b = new Set(['2026-09-23', '2026-09-24'])
    // 2026-09-22 is missing from b, so the streak stops after the 23rd/24th.
    expect(computeFullStreak([a, b], '2026-09-24')).toBe(2)
  })

  it('crosses a year boundary correctly', () => {
    const a = new Set(['2025-12-31', '2026-01-01'])
    expect(computeFullStreak([a], '2026-01-01')).toBe(2)
  })

  it('treats a single fully-checked-off set as one streak', () => {
    const a = new Set(['2026-09-24'])
    expect(computeFullStreak([a], '2026-09-24')).toBe(1)
  })
})
