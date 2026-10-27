import { useState } from 'react'

type Props = {
  onDelete: () => void
  deleting: boolean
  title: string
}

export function ConfirmDeleteButton({ onDelete, deleting, title }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (deleting) return <span className="text-xs text-gray-400 shrink-0">Verwijderen...</span>
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} title={title} className="text-xs text-red-400 hover:text-red-600 shrink-0">
        ✕ Verwijderen
      </button>
    )
  }
  return (
    <span className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-gray-600">Verwijderen?</span>
      <button onClick={() => { setConfirming(false); onDelete() }} className="text-xs text-red-600 hover:underline font-medium">Ja</button>
      <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:underline">Nee</button>
    </span>
  )
}
