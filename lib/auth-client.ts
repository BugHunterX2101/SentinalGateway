'use client'

import { createAuthClient } from 'better-auth/react'

// Client-side baseURL: use explicit env var or fallback to window.origin
// This ensures CORS works correctly on preview deployments with dynamic URLs
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? window.location.origin
  }
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? ''
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signIn, signUp, signOut, useSession } = authClient