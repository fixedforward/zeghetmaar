import { useState } from 'react'

// A free text field on a card, just to write down what you think the answer is. It isn't
// checked; Enter flips the card and leaves the field, so 1/2 work again right away.
export function CardScratchField({ revealed, onReveal }: { revealed: boolean; onReveal: () => void }) {
  const [text, setText] = useState('')
  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => {
        if (e.key !== 'Enter' || e.shiftKey) return
        e.preventDefault()
        e.currentTarget.blur()
        onReveal()
      }}
      readOnly={revealed}
      rows={2}
      placeholder={revealed ? '' : 'Typ hier je antwoord (optioneel) — Enter draait de kaart om'}
      className={`w-full p-2 border rounded text-sm ${revealed ? 'bg-gray-50 text-gray-600' : ''}`}
    />
  )
}
