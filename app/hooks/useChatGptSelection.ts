import { useEffect, useState } from 'react'
import { explainPhrasePrompt } from '../lib/prompts'

export interface ChatGptLink {
  x: number
  y: number
  prompt: string
  text: string
}

// context: a fixed text, or a function that picks it for the current selection.
export function useChatGptSelection(context?: string | ((selection: Selection) => string | undefined)) {
  const [chatGptLink, setChatGptLink] = useState<ChatGptLink | null>(null)

  useEffect(() => {
    if (!chatGptLink) return
    const closeIfOutside = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('[data-chatgpt-link]')) setChatGptLink(null)
    }
    document.addEventListener('mousedown', closeIfOutside)
    return () => document.removeEventListener('mousedown', closeIfOutside)
  }, [chatGptLink])

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection()
    const selected = selection?.toString().trim()
    if (!selection || !selected) {
      setChatGptLink(null)
      return
    }
    const contextText = typeof context === 'function' ? context(selection) : context
    setChatGptLink({ x: e.clientX, y: e.clientY + 12, prompt: explainPhrasePrompt(selected, contextText), text: selected })
  }

  return { chatGptLink, handleTextSelection, closeChatGptLink: () => setChatGptLink(null) }
}
