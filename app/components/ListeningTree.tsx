import type { ListeningTreeFolder } from '../types'

export function listeningPlayerUrl(folderId: string, fileId: string): string {
  return `/luisteren-test?folder=${encodeURIComponent(folderId)}&file=${encodeURIComponent(fileId)}`
}

export function ListeningTree({ folder }: { folder: ListeningTreeFolder }) {
  return (
    <ul className="space-y-1">
      {folder.folders.map(sub => (
        <li key={sub.id}>
          <details>
            <summary className="cursor-pointer text-sm text-gray-700">📁 {sub.name}</summary>
            <div className="pl-5 mt-1">
              <ListeningTree folder={sub} />
            </div>
          </details>
        </li>
      ))}
      {folder.files.map(file => (
        <li key={file.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <a href={listeningPlayerUrl(folder.id, file.id)} className="text-blue-600 hover:underline">
            {/\.mp3$/i.test(file.name) ? '🎧' : '🎬'} {file.name}
          </a>
          {!file.hasSubtitles && <span className="text-xs text-orange-600">geen ondertitels</span>}
        </li>
      ))}
    </ul>
  )
}
