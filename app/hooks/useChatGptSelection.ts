import { useEffect, useState } from 'react'
import { buildChatGptExplainUrl } from '../lib/chatgpt'

export interface ChatGptLink {
  x: number
  y: number
  url: string
  text: string
}

export function useChatGptSelection() {
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
    const selected = window.getSelection()?.toString().trim()
    if (!selected) {
      setChatGptLink(null)
      return
    }
    setChatGptLink({ x: e.clientX, y: e.clientY + 12, url: buildChatGptExplainUrl(selected), text: selected })
  }

  return { chatGptLink, handleTextSelection, closeChatGptLink: () => setChatGptLink(null) }
}
