import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { config } from '@/app/lib/config'
import { findOrCreateGoogleUserAsync } from '@/app/lib/userStore'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: config.auth.nextAuthSecret,
  pages: {
    error: '/',
  },
  providers: [
    Google({
      clientId: config.auth.oauth2Providers.google.clientId,
      clientSecret: config.auth.oauth2Providers.google.clientSecret,
      authorization: {
        params: { scope: 'openid email profile' },
      },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      return config.auth.oauth2Providers.google.allowedEmails.includes(profile?.email ?? '')
    },
    async jwt({ token, profile }) {
      if (profile?.sub && profile?.email) {
        token.userId = await findOrCreateGoogleUserAsync(profile.email, profile.sub)
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.userId) session.user.id = token.userId as string
      return session
    },
  },
})
