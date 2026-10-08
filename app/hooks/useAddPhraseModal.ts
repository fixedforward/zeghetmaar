import { useCallback, useState } from 'react'
import type { useWords } from './useWords'

// Opens AddPhraseModal prefilled with a phrase, e.g. text selected in an article or transcript.
export function useAddPhraseModal(words: ReturnType<typeof useWords>) {
  const [open, setOpen] = useState(false)

  const openWith = (text: string) => {
    words.loadWords()
    words.startAddWord(text)
    setOpen(true)
  }

  const close = useCallback(() => setOpen(false), [])

  return { open, openWith, close }
}
