import { connectAsync } from './db/mongoose'
import { UserModel } from './db/userModel'

export async function findOrCreateGoogleUserAsync(email: string, googleSub: string): Promise<string> {
  await connectAsync()

  const existing = await UserModel.findOne({ googleSub })
  if (existing) return existing.id

  const created = await UserModel.create({
    email,
    googleSub,
    createdAt: new Date().toISOString(),
  })
  return created.id
}
