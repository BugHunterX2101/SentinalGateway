import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// Runtime guard — safe to throw here because this only runs on actual requests,
// never during `next build` static page-data collection.
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET is not set. Add it to your Vercel project environment variables.'
  )
}

export const { GET, POST } = toNextJsHandler(auth.handler)
