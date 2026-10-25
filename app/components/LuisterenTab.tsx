import { useEffect } from 'react'
import type { useListeningTree } from '../hooks/useListeningTree'
import { ListeningTree } from './ListeningTree'

type Props = {
  isLoggedIn: boolean
  listeningTree: ReturnType<typeof useListeningTree>
}

export function LuisterenTab({ isLoggedIn, listeningTree }: Props) {
  useEffect(() => {
    if (isLoggedIn) listeningTree.loadTree()
  }, [isLoggedIn, listeningTree.loadTree])

  if (!isLoggedIn) {
    return <p className="text-sm text-gray-500">Log in om je luisterbestanden te zien.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-blue-800 bg-blue-50 border border-blue-100 rounded p-2">
        🎧 Doel: luister elke dag 10 minuten actief en herhaal elke zin die je niet snapt.
      </p>
      <a href="/luisteren-oefenen" className="inline-block px-3 py-1.5 text-sm rounded bg-teal-500 text-white hover:bg-teal-600">
        🎯 Moeilijk te verstaan oefenen
      </a>
      <section className="border rounded p-3 bg-white space-y-2">
        <h2 className="text-sm font-medium text-gray-700">Video&apos;s en audio uit Drive</h2>
        {listeningTree.loading && <p className="text-sm text-gray-400">Laden...</p>}
        {listeningTree.error && <p className="text-sm text-red-500">{listeningTree.error}</p>}
        {listeningTree.tree && (listeningTree.tree.folders.length > 0 || listeningTree.tree.files.length > 0
          ? <ListeningTree folder={listeningTree.tree} />
          : <p className="text-sm text-gray-400">Geen .mp3- of .mp4-bestanden gevonden.</p>)}
      </section>
    </div>
  )
}
