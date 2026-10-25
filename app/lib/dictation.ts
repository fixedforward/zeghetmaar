export interface DictationWord {
  text: string
  heard: boolean
}

export interface DictationResult {
  // The real line, word by word, each marked heard or not.
  words: DictationWord[]
  correct: boolean
}

// Case and punctuation don't count: "Zie je," matches "zie je".
const wordKey = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// Marks the words of the real line that I typed, in order (longest common subsequence).
// Correct = every word heard and nothing extra typed.
export function compareDictation(typed: string, target: string): DictationResult {
  const targetWords = target.split(/\s+/).filter(Boolean)
  const targetKeys = targetWords.map(wordKey)
  const typedKeys = typed.split(/\s+/).map(wordKey).filter(Boolean)

  const lengths = Array.from({ length: targetKeys.length + 1 }, () => new Array<number>(typedKeys.length + 1).fill(0))
  for (let i = targetKeys.length - 1; i >= 0; i--) {
    for (let j = typedKeys.length - 1; j >= 0; j--) {
      lengths[i][j] = targetKeys[i] && targetKeys[i] === typedKeys[j]
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1])
    }
  }

  const heard = targetKeys.map(key => !key)
  let matched = 0
  for (let i = 0, j = 0; i < targetKeys.length && j < typedKeys.length;) {
    if (targetKeys[i] && targetKeys[i] === typedKeys[j]) {
      heard[i] = true
      matched++
      i++
      j++
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++
    } else {
      j++
    }
  }

  return {
    words: targetWords.map((text, i) => ({ text, heard: heard[i] })),
    correct: heard.every(Boolean) && matched === typedKeys.length,
  }
}
