import { describe, it, expect } from 'vitest'
import { parseSrt, findActiveCueIndex, sentencesAroundCues } from '../lib/srt'

describe('parseSrt', () => {
  it('reads timings and joins multi-line text', () => {
    const srt = '1\n00:00:00,500 --> 00:00:02,250\nDus dat seizoen\nkwam ik door.\n\n2\n00:00:02,500 --> 00:00:04,000\nToen was het voorbij.\n'

    expect(parseSrt(srt)).toEqual([
      { start: 0.5, end: 2.25, text: 'Dus dat seizoen kwam ik door.' },
      { start: 2.5, end: 4, text: 'Toen was het voorbij.' },
    ])
  })

  it('handles a BOM, CRLF line endings and hours', () => {
    const srt = '﻿1\r\n01:19:19,500 --> 01:19:24,000\r\nTot ziens.\r\n'

    expect(parseSrt(srt)).toEqual([{ start: 4759.5, end: 4764, text: 'Tot ziens.' }])
  })

  it('skips blocks without a timing line or without text', () => {
    const srt = 'kapot blok\n\n1\n00:00:01,000 --> 00:00:02,000\n\n\n2\n00:00:03,000 --> 00:00:04,000\nWel tekst.'

    expect(parseSrt(srt)).toEqual([{ start: 3, end: 4, text: 'Wel tekst.' }])
  })

  it('sorts cues by start time', () => {
    const srt = '2\n00:00:05,000 --> 00:00:06,000\nTwee\n\n1\n00:00:01,000 --> 00:00:02,000\nEen'

    expect(parseSrt(srt).map(c => c.text)).toEqual(['Een', 'Twee'])
  })
})

describe('findActiveCueIndex', () => {
  const cues = [
    { start: 1, end: 2, text: 'a' },
    { start: 2, end: 3, text: 'b' },
    { start: 5, end: 6, text: 'c' },
  ]

  it('returns -1 before the first cue and for no cues', () => {
    expect(findActiveCueIndex(cues, 0.5)).toBe(-1)
    expect(findActiveCueIndex([], 10)).toBe(-1)
  })

  it('returns the cue that starts exactly at the time', () => {
    expect(findActiveCueIndex(cues, 2)).toBe(1)
  })

  it('keeps the previous cue during a gap and the last cue after the end', () => {
    expect(findActiveCueIndex(cues, 4)).toBe(1)
    expect(findActiveCueIndex(cues, 100)).toBe(2)
  })
})

describe('sentencesAroundCues', () => {
  const cues = ['Een. Twee.', 'Drie is een', 'lange zin. Vier.', 'Vijf.', 'Zes.', 'Zeven. Acht.', 'Negen.', 'Tien.']
    .map((text, i) => ({ start: i, end: i + 1, text }))

  it('gives 3 sentences before and after the sentence of the cue', () => {
    expect(sentencesAroundCues(cues, 4, 4, 3)).toBe('Drie is een lange zin. Vier. Vijf. Zes. Zeven. Acht. Negen.')
  })

  it('treats a sentence split over cues as one sentence', () => {
    expect(sentencesAroundCues(cues, 1, 1, 1)).toBe('Twee. Drie is een lange zin. Vier.')
    expect(sentencesAroundCues(cues, 1, 1, 0)).toBe('Drie is een lange zin.')
  })

  it('covers every sentence of a selection over several cues', () => {
    expect(sentencesAroundCues(cues, 1, 2, 0)).toBe('Drie is een lange zin. Vier.')
  })

  it('stops at the start and the end of the transcript', () => {
    expect(sentencesAroundCues(cues, 1, 1, 3)).toBe('Een. Twee. Drie is een lange zin. Vier. Vijf. Zes.')
    expect(sentencesAroundCues(cues, 7, 7, 3)).toBe('Zeven. Acht. Negen. Tien.')
  })
})
