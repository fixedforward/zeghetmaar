import type { ChatGptLink } from '../hooks/useChatGptSelection'
import { openChatGptInBackground } from '../lib/chatgpt'

interface Props {
  link: ChatGptLink | null
  onClose: () => void
  onAddPhrase?: (text: string) => void
}

const buttonClass = 'px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50'

export function ChatGptSelectionLink({ link, onClose, onAddPhrase }: Props) {
  if (!link) return null
  return (
    <div
      data-chatgpt-link
      className="fixed z-50 flex bg-white border border-gray-200 rounded shadow-lg divide-x divide-gray-200"
      style={{ left: Math.min(link.x, window.innerWidth - (onAddPhrase ? 300 : 180)), top: link.y }}
    >
      <button
        type="button"
        onClick={() => { openChatGptInBackground(link.url); onClose() }}
        className={buttonClass}
      >
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
