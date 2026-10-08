import { TranscriptPlayer } from '../components/TranscriptPlayer'

export default async function LuisterenTestPage({ searchParams }: { searchParams: Promise<{ folder?: string; file?: string }> }) {
  const { folder, file } = await searchParams
  return (
    <main className="p-4 max-w-[1600px] mx-auto space-y-3">
      <a href="/?tab=luisteren" className="text-sm text-blue-600 hover:underline">← Luisteren</a>
      {folder && file
        ? <TranscriptPlayer folderId={folder} fileId={file} />
        : <p className="text-sm text-gray-500">Kies een video of audiobestand in het Luisteren-tab.</p>}
    </main>
  )
}
