import type { SelectionPopup as SelectionPopupType } from '../types'

interface Props {
  popup: SelectionPopupType
  onClose: () => void
}

export function SelectionPopup({ popup, onClose }: Props) {
  return (
    <div
      data-selection-popup
      className="fixed z-50 max-w-xs bg-white border border-gray-200 rounded shadow-lg p-3 text-sm"
      style={{ left: Math.min(popup.x, window.innerWidth - 320), top: popup.y }}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="font-medium text-gray-700 truncate">"{popup.text}"</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 shrink-0 leading-none"
        >
          ✕
        </button>
      </div>
      {popup.loading
        ? <span className="text-gray-400 italic">Laden...</span>
        : <p className="text-gray-800 whitespace-pre-wrap">{popup.explanation}</p>
      }
    </div>
  )
}
