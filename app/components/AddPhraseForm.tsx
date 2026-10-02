import type { useWords } from '../hooks/useWords'
import { MeaningsEditor } from './MeaningsEditor'
import { TagsSelect } from './TagsSelect'

interface Props {
  words: ReturnType<typeof useWords>
  allTags: string[]
  onAdded?: () => void
}

export function AddPhraseForm({ words, allTags, onAdded }: Props) {
  const submit = () => {
    words.handleAddWord().then(added => { if (added) onAdded?.() })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frase</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={words.newWord}
            onChange={(e) => words.setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="bijv. gele koorts komt niet voor in Amerika"
            className="flex-1 p-2 border rounded"
          />
          {words.newWord && (
            <button
              onClick={() => words.setNewWord('')}
              className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
              title="Wissen"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <MeaningsEditor
        meanings={words.newMeanings}
        onChange={words.setNewMeanings}
        word={words.newWord}
        onGenerateTranslation={(w, i) => words.generateAiTranslation(w, 'add', i)}
        onGenerateExamples={(w, i) => words.generateAiExamples(w, 'add', i)}
        translationLoading={words.aiTranslationLoading}
        examplesLoading={words.aiExamplesLoading}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <TagsSelect allTags={allTags} selected={words.newTags} onChange={words.setNewTags} />
      </div>

      {words.addError && <p className="text-sm text-red-600">{words.addError}</p>}
      <button
        onClick={submit}
        disabled={words.addLoading || !words.newWord.trim() || !words.newMeanings.some(m => m.translation.trim())}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {words.addLoading ? 'Opslaan...' : 'Opslaan'}
      </button>
    </div>
  )
}
