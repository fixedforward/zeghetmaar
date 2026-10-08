import { useState } from 'react'
import type { ChatGptLink } from '../hooks/useChatGptSelection'
import { openChatGptWithPromptAsync } from '../lib/chatgpt'

interface Props {
  link: ChatGptLink | null
  onClose: () => void
  onAddPhrase?: (text: string) => void
}

const boxClass = 'fixed z-50 flex bg-white border border-gray-200 rounded shadow-lg divide-x divide-gray-200'
const buttonClass = 'px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50'

export function ChatGptSelectionLink({ link, onClose, onAddPhrase }: Props) {
  const [copiedLink, setCopiedLink] = useState<ChatGptLink | null>(null)
  if (!link) return null

  const openChatGptAsync = async () => {
    try {
      if (await openChatGptWithPromptAsync(link.prompt) === 'clipboard') setCopiedLink(link)
      else onClose()
    } catch (err) {
      console.error('[ChatGptSelectionLink]', (err as Error).message)
      onClose()
    }
  }

  // Stays open as the paste instruction; it closes on the next click outside it.
  if (copiedLink === link) {
    return (
      <div data-chatgpt-link className={boxClass} style={{ left: Math.min(link.x, window.innerWidth - 340), top: link.y }}>
        <p className="px-3 py-1.5 text-sm text-gray-700">Vraag + hele tekst gekopieerd. Plak in ChatGPT met ⌘V.</p>
      </div>
    )
  }

  return (
    <div
      data-chatgpt-link
      className={boxClass}
      style={{ left: Math.min(link.x, window.innerWidth - (onAddPhrase ? 300 : 180)), top: link.y }}
    >
      <button type="button" onClick={openChatGptAsync} className={buttonClass}>
        Open in ChatGPT
      </button>
      {onAddPhrase && (
        <button
          type="button"
          onClick={() => { onAddPhrase(link.text); onClose() }}
          className={buttonClass}
        >
          + Fraselijst
        </button>
      )}
    </div>
  )
}
