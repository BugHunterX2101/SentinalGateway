import { cache } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

// Memoized per request. The middleware, pages, and server actions all resolve
// the session through this, so one request render costs a single session
// lookup instead of one per call site (previously: proxy + page + action =
// up to 3 DB round-trips per navigation).
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  return session
})

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}
