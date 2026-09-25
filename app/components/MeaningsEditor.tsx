import type { Meaning } from '../types'

interface Props {
  meanings: Meaning[]
  onChange: (meanings: Meaning[]) => void
  word: string
  onGenerateTranslation: (word: string, index: number) => void
  onGenerateExamples: (word: string, index: number) => void
  translationLoading: boolean
  examplesLoading: boolean
}

export function MeaningsEditor({
  meanings, onChange, word, onGenerateTranslation, onGenerateExamples, translationLoading, examplesLoading,
}: Props) {
  const updateMeaning = (index: number, update: Partial<Meaning>) => {
    onChange(meanings.map((m, i) => i === index ? { ...m, ...update } : m))
  }
  const removeMeaning = (index: number) => onChange(meanings.filter((_, i) => i !== index))
  const addMeaning = () => onChange([...meanings, { translation: '', examples: [] }])

  const updateExample = (mi: number, ei: number, value: string) => {
    const examples = [...meanings[mi].examples]
    examples[ei] = value
    updateMeaning(mi, { examples })
  }
  const removeExample = (mi: number, ei: number) => {
    updateMeaning(mi, { examples: meanings[mi].examples.filter((_, j) => j !== ei) })
  }
  const addExample = (mi: number) => {
    updateMeaning(mi, { examples: [...meanings[mi].examples, ''] })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Betekenissen</label>
      {meanings.map((meaning, mi) => (
        <div key={mi} className="border rounded p-3 mb-2 bg-gray-50 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={meaning.translation}
                  onChange={(e) => updateMeaning(mi, { translation: e.target.value })}
                  placeholder="bijv. yellow fever does not occur in America"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={() => onGenerateTranslation(word, mi)}
                  disabled={translationLoading || !word.trim()}
                  className="text-sm text-purple-600 hover:underline disabled:opacity-50 shrink-0"
                >
                  {translationLoading ? 'Vertalen...' : 'AI vertaling'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Voorbeeldzinnen</label>
                {meaning.examples.map((ex, ei) => (
                  <div key={ei} className="flex gap-2 mb-2">
                    <textarea
                      value={ex}
                      onChange={(e) => updateExample(mi, ei, e.target.value)}
                      placeholder="Dutch sentence — English translation"
                      rows={2}
                      className="flex-1 p-2 border rounded text-sm resize-y"
                    />
                    <button
                      onClick={() => removeExample(mi, ei)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button onClick={() => addExample(mi)} className="text-sm text-blue-600 hover:underline">
                  + Voorbeeld toevoegen
                </button>
                <button
                  onClick={() => onGenerateExamples(word, mi)}
                  disabled={examplesLoading || !word.trim()}
                  className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
                >
                  {examplesLoading ? 'Genereren...' : 'AI voorbeelden'}
                </button>
              </div>
            </div>
            {meanings.length > 1 && (
              <button
                onClick={() => removeMeaning(mi)}
                className="text-red-500 hover:text-red-700 text-sm px-2 shrink-0"
                title="Betekenis verwijderen"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addMeaning} className="text-sm text-blue-600 hover:underline">
        + Betekenis toevoegen
      </button>
    </div>
  )
}
