import { TAB_LABELS } from '../config/tabs'
import { MODEL_OPTIONS } from '../config/models'
import type { useTabSettings } from '../hooks/useTabSettings'

interface SessionLike {
  user?: {
    name?: string | null
    image?: string | null
  }
}

type Props = ReturnType<typeof useTabSettings> & {
  activeModel: string
  setActiveModel: (model: string) => void
  session: SessionLike | null
  onSignIn: () => void
  onSignOut: () => void
}

export function SettingsModal(props: Props) {
  const { isOpen, close, order, hidden, toggleVisible, moveUp, moveDown, activeModel, setActiveModel, session, onSignIn, onSignOut } = props

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-gray-900">Instellingen</h2>
          <button onClick={close} title="Sluiten" className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account</p>
          {session ? (
            <div className="flex items-center gap-2">
              {session.user?.image && (
                <img src={session.user.image} alt="avatar" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-gray-700 flex-1">{session.user?.name}</span>
              <button
                onClick={onSignOut}
                className="text-sm border rounded px-2 py-1 bg-white text-gray-700 hover:bg-gray-100"
              >
                Uitloggen
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="text-sm border rounded px-2 py-1 bg-white text-gray-700 hover:bg-gray-100"
            >
              Log in om frases te beheren
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI-model</p>
          <select
            value={activeModel}
            onChange={e => setActiveModel(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1 bg-white text-gray-700"
          >
            {MODEL_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tabs</p>
          <ul className="space-y-1">
            {order.map((tab, i) => (
              <li key={tab} className="flex items-center gap-2 border rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={!hidden.has(tab)}
                  onChange={() => toggleVisible(tab)}
                  className="shrink-0"
                />
                <span className={`flex-1 text-sm ${hidden.has(tab) ? 'text-gray-400' : 'text-gray-800'}`}>
                  {TAB_LABELS[tab]}
                </span>
                <button
                  onClick={() => moveUp(tab)}
                  disabled={i === 0}
                  title="Omhoog"
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(tab)}
                  disabled={i === order.length - 1}
                  title="Omlaag"
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs px-1"
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
