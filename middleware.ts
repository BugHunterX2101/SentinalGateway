import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter for auth endpoints.
// State is shared within a single serverless function instance.
// For multi-region deployments, swap this for an Upstash Redis store.

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

function checkRateLimit(identifier: string): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, resetAt: now + WINDOW_MS }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, resetAt: entry.resetAt }
}

export function middleware(request: NextRequest) {
  // Apply rate limiting only to auth API routes.
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'anonymous'

    const { allowed, resetAt } = checkRateLimit(ip)

    if (!allowed) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  // Only run on auth API routes — skip all other routes for performance.
  matcher: ['/api/auth/:path*'],
}
