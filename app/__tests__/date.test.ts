import { describe, it, expect } from 'vitest'
import { formatDutchDate } from '../lib/date'

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
