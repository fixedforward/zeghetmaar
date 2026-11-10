import { describe, it, expect } from 'vitest'
import { addDaysIso, formatDutchDate, formatDutchWeekdayDate } from '../lib/date'

describe('formatDutchDate', () => {
  it('formats an ISO date as "D maand JJJJ"', () => {
    expect(formatDutchDate('2026-09-19')).toBe('19 september 2026')
  })

  it('does not zero-pad the day', () => {
    expect(formatDutchDate('2026-01-05')).toBe('5 januari 2026')
  })

  it('maps every month correctly', () => {
    expect(formatDutchDate('2026-12-31')).toBe('31 december 2026')
  })
})

describe('addDaysIso', () => {
  it('goes back across a month end', () => {
    expect(addDaysIso('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('goes forward across a year end', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('is not thrown off by the daylight saving change', () => {
    expect(addDaysIso('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('formatDutchWeekdayDate', () => {
  it('writes the weekday, day and month', () => {
    expect(formatDutchWeekdayDate('2026-11-10')).toBe('dinsdag 10 november')
  })

  it('knows Sunday', () => {
    expect(formatDutchWeekdayDate('2026-11-15')).toBe('zondag 15 november')
  })
})
