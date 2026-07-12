// Simple in-memory rate limiter for auth endpoints
// In production, replace with Upstash Redis or similar

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function createRateLimiter(config: RateLimitConfig) {
  return async (identifier: string): Promise<{ allowed: boolean; resetAt: number }> => {
    const now = Date.now()
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

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)

// Export a default rate limiter for auth endpoints
// 10 requests per minute per IP
export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
})