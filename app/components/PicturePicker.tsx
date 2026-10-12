import { usePictures } from '../hooks/usePictures'
import { findPictureForPhrase } from '../lib/pictures'
import { PhrasePicture } from './PhrasePicture'

type Props = {
  phrase: string
  value: string | null
  onChange: (fileId: string | null) => void
}

export function PicturePicker({ phrase, value, onChange }: Props) {
  const { pictures, loading, error } = usePictures(true)
  const suggestion = value ? undefined : findPictureForPhrase(pictures, phrase)
  const isUnknown = !!value && !loading && !pictures.some(p => p.id === value)

  return (
    <div className="space-y-2">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        disabled={loading}
        aria-label="Afbeelding"
        className="w-full p-2 border rounded text-sm"
      >
        <option value="">{loading ? 'Afbeeldingen laden...' : '— Geen afbeelding —'}</option>
        {isUnknown && <option value={value}>Onbekend bestand ({value})</option>}
        {pictures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {suggestion && (
        <button type="button" onClick={() => onChange(suggestion.id)} className="text-xs text-blue-600 hover:underline">
          Gebruik {suggestion.name}
        </button>
      )}
      {value && <PhrasePicture fileId={value} alt={phrase} />}
    </div>
  )
}
