import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import fs from 'fs'
import path from 'path'

interface AppConfig {
  userCreds?: { authFile?: string }
}

interface UserCreds {
  googleClientId: string
  googleClientSecret: string
  nextAuthSecret: string
  allowedEmail: string
}

function loadUserCreds(): UserCreds {
  // Priority 1: env var for the credentials file path
  let credFilePath = process.env.USERCREDS_AUTHFILE

  // Priority 2: app/config.json -> userCreds.authFile
  if (!credFilePath) {
    try {
      const configPath = path.join(process.cwd(), 'app', 'config.json')
      const appConfig: AppConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      credFilePath = appConfig.userCreds?.authFile
    } catch {
      // config.json is optional
    }
  }

  if (!credFilePath) {
    throw new Error(
      'User credentials file not configured. Set USERCREDS_AUTHFILE env var or add userCreds.authFile to app/config.json.'
    )
  }

  // Resolve relative paths against project root
  const resolvedPath = path.isAbsolute(credFilePath)
    ? credFilePath
    : path.join(process.cwd(), credFilePath)

  let creds: UserCreds
  try {
    creds = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read user credentials file at "${resolvedPath}": ${err}`)
  }

  if (!creds.googleClientId || !creds.googleClientSecret || !creds.nextAuthSecret || !creds.allowedEmail) {
    throw new Error(
      'userauth.cred.json must contain: googleClientId, googleClientSecret, nextAuthSecret, allowedEmail'
    )
  }

  return creds
}

const creds = loadUserCreds()

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: creds.nextAuthSecret,
  providers: [
    Google({
      clientId: creds.googleClientId,
      clientSecret: creds.googleClientSecret,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      return profile?.email === creds.allowedEmail
    },
  },
})
