import mongoose, { Schema } from 'mongoose'

export interface UserDoc {
  email: string
  googleSub?: string
  passwordHash?: string
  createdAt: string
}

const userSchema = new Schema<UserDoc>({
  email: { type: String, required: true, unique: true },
  googleSub: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  createdAt: { type: String, required: true },
})

export const UserModel = mongoose.models.User ?? mongoose.model<UserDoc>('User', userSchema)
