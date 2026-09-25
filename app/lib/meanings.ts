import type { Meaning } from '../types'

export function joinMeanings(meanings: Meaning[]): string {
  return meanings.map(m => m.translation).join('; ')
}
