import type { useAiChat } from '../hooks/useAiChat'

type Props = Pick<
  ReturnType<typeof useAiChat>,
  'englishInput' | 'translationResult' | 'isTranslating' | 'setEnglishInput' | 'handleTranslate'
>

export function VertalerTab({ englishInput, translationResult, isTranslating, setEnglishInput, handleTranslate }: Props) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Typ een Engelse zin en krijg 2 of 3 manieren om het in het Nederlands te zeggen.</p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={englishInput}
          onChange={(e) => setEnglishInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
          placeholder="Type an English sentence..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !englishInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isTranslating ? 'Vertalen...' : 'Vertaal'}
        </button>
      </div>
      {translationResult && (
        <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-wrap text-gray-800">
          {translationResult}
        </div>
      )}
    </div>
  )
}
