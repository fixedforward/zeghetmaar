import type { ChatGptLink } from '../hooks/useChatGptSelection'
import { openChatGptInBackground } from '../lib/chatgpt'

interface Props {
  link: ChatGptLink | null
  onClose: () => void
}

export function ChatGptSelectionLink({ link, onClose }: Props) {
  if (!link) return null
  return (
    <button
      type="button"
      data-chatgpt-link
      onClick={() => { openChatGptInBackground(link.url); onClose() }}
      className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50"
      style={{ left: Math.min(link.x, window.innerWidth - 180), top: link.y }}
    >
      Open in ChatGPT
    </button>
  )
}
