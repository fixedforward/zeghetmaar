import type { TranscriptCue } from '../types'

const TIMING = /(\d+):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{3})/

function toSeconds(hours: string, minutes: string, seconds: string, millis: string): number {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(millis) / 1000
}

export function parseSrt(text: string): TranscriptCue[] {
  const cues: TranscriptCue[] = []
  for (const block of text.replace(/^﻿/, '').split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/)
    const timingIndex = lines.findIndex(line => TIMING.test(line))
    if (timingIndex === -1) continue
    const cueText = lines.slice(timingIndex + 1).map(line => line.trim()).filter(Boolean).join(' ')
    if (!cueText) continue
    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = lines[timingIndex].match(TIMING)!
    cues.push({ start: toSeconds(h1, m1, s1, ms1), end: toSeconds(h2, m2, s2, ms2), text: cueText })
  }
  return cues.sort((a, b) => a.start - b.start)
}

// The last cue that has started, so the highlight stays on it during a pause between cues.
// Binary search, so cues must be sorted by start (parseSrt does that).
export function findActiveCueIndex(cues: TranscriptCue[], seconds: number): number {
  let low = 0
  let high = cues.length - 1
  let found = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (cues[mid].start <= seconds) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}

// Cues are subtitle fragments that often stop mid-sentence, so the cue texts are joined
// and split into real sentences before taking `around` sentences on each side.
export function sentencesAroundCues(cues: TranscriptCue[], firstCue: number, lastCue: number, around: number): string {
  let text = ''
  const cueStarts: number[] = []
  for (const cue of cues) {
    cueStarts.push(text.length)
    text += `${cue.text} `
  }
  const sentences = [...text.matchAll(/[^.!?]+[.!?]*\s*/g)]
  const sentenceAt = (offset: number) => sentences.findLastIndex(m => m.index <= offset)
  const from = sentenceAt(cueStarts[firstCue])
  const to = sentenceAt(cueStarts[lastCue] + cues[lastCue].text.length - 1)
  return sentences.slice(Math.max(0, from - around), to + around + 1).map(m => m[0].trim()).join(' ')
}
