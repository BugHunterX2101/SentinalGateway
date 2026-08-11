// Simple in-memory rate limiter for auth endpoints.
// In production, replace with Upstash Redis or similar.
//
// Note: there is deliberately NO setInterval-based cleanup here. A module-
// scope timer would keep every serverless process alive between requests.
// Entries expire lazily on access and the store is capped so it cannot grow
// unboundedly.

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Hard cap so a spoofed IP storm can never grow the map without bound.
const MAX_ENTRIES = 10_000

const store = new Map<string, RateLimitEntry>()

export function createRateLimiter(config: RateLimitConfig) {
  return async (identifier: string): Promise<{ allowed: boolean; resetAt: number }> => {
    const now = Date.now()

    if (store.size >= MAX_ENTRIES) {
      // Opportunistic purge of expired entries before evicting anything live.
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key)
      }
      if (store.size >= MAX_ENTRIES) store.clear()
    }

    const entry = store.get(identifier)

    if (!entry || now > entry.resetAt) {
      store.set(identifier, { count: 1, resetAt: now + config.windowMs })
      return { allowed: true, resetAt: now + config.windowMs }
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, resetAt: entry.resetAt }
    }

    entry.count++
    return { allowed: true, resetAt: entry.resetAt }
  }
}

// Default rate limiter for auth endpoints: 10 requests per minute per IP.
// The edge proxy (proxy.ts) enforces the same budget as the first line of
// defence; this one is a second layer for direct hits that bypass the edge.
export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
})

// Stricter budget for account creation: 8 sign-ups per hour per IP, layered
// on top of the general auth limiter.
export const signUpRateLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  maxRequests: 8,
})