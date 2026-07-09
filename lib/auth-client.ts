'use client'

import { createAuthClient } from 'better-auth/react'

// Use NEXT_PUBLIC_BETTER_AUTH_URL if set, otherwise fall back to the current
// origin so requests always go to the same host as the page — this avoids
// CORS failures on preview deployments with dynamic URLs.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '',
})

export const { signIn, signUp, signOut, useSession } = authClient
