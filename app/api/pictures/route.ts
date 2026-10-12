import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPicturesFolderId, listPicturesAsync } from '@/app/lib/drivePictureStore'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Login om feature te gebruiken.' }, { status: 401 })

  const folderId = getPicturesFolderId()
  if (!folderId) return NextResponse.json({ error: 'Afbeeldingenmap is niet geconfigureerd.' }, { status: 501 })

  try {
    return NextResponse.json(await listPicturesAsync(folderId))
  } catch (err) {
    console.error('[/api/pictures] Failed to list pictures:', err)
    return NextResponse.json({ error: 'Kon de afbeeldingen niet laden.' }, { status: 500 })
  }
}
