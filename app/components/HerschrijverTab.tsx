import type { useAiChat } from '../hooks/useAiChat'

type Props = Pick<
  ReturnType<typeof useAiChat>,
  | 'input' | 'response' | 'isLoading'
  | 'handleInputChange' | 'handleSubmit' | 'handleRefresh' | 'handleTextSelection'
>

export function HerschrijverTab({ input, response, isLoading, handleInputChange, handleSubmit, handleRefresh, handleTextSelection }: Props) {
  return (
    <>
      <div className="flex gap-2 mb-4">
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          placeholder="Type Dutch sentence..."
          rows={3}
          className="flex-1 p-2 border rounded resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 self-start"
        >
          {isLoading ? 'Verzenden...' : 'Verzenden'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-4">Druk op Enter om te verzenden, Shift+Enter voor een nieuwe regel</div>


      <div className="border rounded p-3 bg-white mb-4 min-h-[100px]" onMouseUp={handleTextSelection}>
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm text-gray-500">Engels: <span className="text-xs text-gray-400 italic">(selecteer woorden of zinnen voor meer uitleg)</span></div>
          {response && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                ↻ Refresh
              </button>
            </div>
          )}
        </div>
        <div className="text-gray-800 whitespace-pre-wrap">{response}</div>
      </div>
    </>
  )
}
