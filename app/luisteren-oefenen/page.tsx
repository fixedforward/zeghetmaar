import { HardToHearOverview } from '../components/HardToHearOverview'
import { HardToHearVideoPractice } from '../components/HardToHearVideoPractice'

export default async function LuisterenOefenenPage({ searchParams }: { searchParams: Promise<{ folder?: string; file?: string }> }) {
  const { folder, file } = await searchParams
  return (
    <main className="p-4 max-w-[1600px] mx-auto space-y-3">
      {folder && file ? (
        <>
          <a href="/luisteren-oefenen" className="text-sm text-blue-600 hover:underline">← Alle video&apos;s</a>
          <HardToHearVideoPractice folderId={folder} fileId={file} />
        </>
      ) : (
        <>
          <a href="/?tab=luisteren" className="text-sm text-blue-600 hover:underline">← Luisteren</a>
          <h1 className="text-lg font-semibold text-gray-800">Moeilijk te verstaan oefenen</h1>
          <HardToHearOverview />
        </>
      )}
    </main>
  )
}
