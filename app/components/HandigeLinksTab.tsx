import { useEffect, useState } from 'react'
import type { UsefulLink } from '../types'
import type { useUsefulLinks } from '../hooks/useUsefulLinks'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { EditableText } from './EditableText'

type Links = ReturnType<typeof useUsefulLinks>

type Props = Links & { isLoggedIn: boolean }

function LinkCard({ link, links }: { link: UsefulLink; links: Links }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="border rounded p-3 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold break-all">
          {link.title}
        </a>
        <span className="flex items-center gap-3 shrink-0">
          <button onClick={() => setEditing(!editing)} className="text-xs text-gray-500 hover:underline">
            {editing ? 'Klaar' : 'Bewerken'}
          </button>
          <ConfirmDeleteButton onDelete={() => links.deleteLinkAsync(link.id)} deleting={false} title="Link verwijderen" />
        </span>
      </div>
      {editing && (
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-xs text-gray-400">Naam</span>
            <EditableText text={link.title} saving={links.saving} onSave={text => links.setTitleAsync(link.id, text)} textClassName="text-gray-800" />
          </div>
          <div>
            <span className="text-xs text-gray-400">Link</span>
            <EditableText text={link.url} saving={links.saving} onSave={text => links.setUrlAsync(link.id, text)} textClassName="text-gray-800 break-all" />
          </div>
        </div>
      )}
    </li>
  )
}

export function HandigeLinksTab({ isLoggedIn, ...links }: Props) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const { loadLinks } = links

  useEffect(() => {
    if (isLoggedIn) loadLinks()
  }, [isLoggedIn, loadLinks])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je handige links te zien.</p>
  }

  const add = async () => {
    if (!url.trim()) return
    if (await links.addLinkAsync(title.trim(), url.trim())) {
      setTitle('')
      setUrl('')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Links die je vaak nodig hebt, op al je apparaten.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Naam (optioneel)"
          className="sm:w-1/3 p-2 border rounded"
        />
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="https://..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={add}
          disabled={links.saving || !url.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>
      {links.error && <p className="text-sm text-red-500">{links.error}</p>}
      {links.loading && <p className="text-sm text-gray-400">Laden...</p>}
      {!links.loading && links.links.length === 0 && <p className="text-sm text-gray-400">Nog geen links.</p>}
      <ul className="space-y-2">
        {links.links.map(link => <LinkCard key={link.id} link={link} links={links} />)}
      </ul>
    </div>
  )
}
