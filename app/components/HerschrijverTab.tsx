import type { useAiChat } from '../hooks/useAiChat'

type Props = Pick<
  ReturnType<typeof useAiChat>,
  | 'input' | 'response' | 'isLoading' | 'isCached'
  | 'handleInputChange' | 'handleSubmit' | 'handleRefresh' | 'handleTextSelection'
>

export function HerschrijverTab({ input, response, isLoading, isCached, handleInputChange, handleSubmit, handleRefresh, handleTextSelection }: Props) {
  return (
    <>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type Dutch sentence..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Verzenden...' : 'Verzenden'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-4">Druk op Enter om te verzenden</div>

      <div className="border rounded p-3 bg-white mb-4 min-h-[100px]" onMouseUp={handleTextSelection}>
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm text-gray-500">Engels:</div>
          {response && (
            <div className="flex items-center gap-2">
              {isCached && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Cached</span>
              )}
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
