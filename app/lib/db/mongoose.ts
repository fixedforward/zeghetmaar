import mongoose from 'mongoose'
import { config } from '../config'

// Cached across Next.js dev hot-reloads so we don't open a new connection per request.
declare global {
  var _mongooseConnPromise: Promise<typeof mongoose> | undefined
}

export function connectAsync(): Promise<typeof mongoose> {
  if (!global._mongooseConnPromise) {
    global._mongooseConnPromise = mongoose.connect(config.database.mongodb.connectionString)
  }
  return global._mongooseConnPromise
}
