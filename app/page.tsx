// Server component wrapper - no 'use client'.
// HomeClient handles its own hydration safety via a mounted guard.
import HomeClient from './HomeClient'

export default function Page() {
  return <HomeClient />
}
