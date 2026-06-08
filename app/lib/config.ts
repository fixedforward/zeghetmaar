import { readFileSync } from 'fs'
import path from 'path'

interface GoogleJsonFile {
  enabled: boolean
  googleDriveFileId: string
  serviceAccount: Record<string, unknown>
}

interface AppConfig {
  aiProviders: {
    openRouterApiKey: string
  }
  database: {
    googleJsonFile: GoogleJsonFile
  }
  auth: {
    nextAuthSecret: string
    oauth2Providers: {
      google: {
        enabled: boolean
        clientId: string
        clientSecret: string
        allowedEmails: string[]
      }
    }
  }
}

function loadConfig(): AppConfig {
  const candidates = [
    path.join(process.cwd(), 'config.json'),
    path.join(process.cwd(), 'app', 'config.json'),
  ]
  let raw: Record<string, unknown> | undefined
  for (const candidate of candidates) {
    try {
      raw = JSON.parse(readFileSync(candidate, 'utf-8'))
      break
    } catch {
      // try next
    }
  }
  if (!raw) {
    throw new Error(`config.json not found. Tried: ${candidates.join(', ')}`)
  }

  const missing: string[] = []

  const ai = raw.aiProviders as Record<string, unknown> | undefined
  if (!ai?.openRouterApiKey) missing.push('aiProviders.openRouterApiKey')

  const db = raw.database as Record<string, unknown> | undefined
  const gj = db?.googleJsonFile as Record<string, unknown> | undefined
  if (!gj) {
    missing.push('database.googleJsonFile')
  } else {
    if (!gj.googleDriveFileId) missing.push('database.googleJsonFile.googleDriveFileId')
    if (!gj.serviceAccount) missing.push('database.googleJsonFile.serviceAccount')
  }

  const auth = raw.auth as Record<string, unknown> | undefined
  if (!auth) {
    missing.push('auth')
  } else {
    if (!auth.nextAuthSecret) missing.push('auth.nextAuthSecret')
    const google = (auth.oauth2Providers as Record<string, unknown> | undefined)?.google as Record<string, unknown> | undefined
    if (!google) {
      missing.push('auth.oauth2Providers.google')
    } else {
      if (!google.clientId) missing.push('auth.oauth2Providers.google.clientId')
      if (!google.clientSecret) missing.push('auth.oauth2Providers.google.clientSecret')
      if (!Array.isArray(google.allowedEmails) || google.allowedEmails.length === 0) missing.push('auth.oauth2Providers.google.allowedEmails')
    }
  }

  if (missing.length > 0) {
    throw new Error(`config.json is missing required fields: ${missing.join(', ')}`)
  }

  return raw as unknown as AppConfig
}

export const config = loadConfig()
