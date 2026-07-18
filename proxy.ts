import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that require authentication
const protectedPaths = ['/command-center', '/flow-canvas', '/decisions']

// Paths that should redirect authenticated users away
const authPaths = ['/sign-in', '/sign-up']

// ---------------------------------------------------------------------------
// In-memory auth rate-limiter (10 req / 60 s per IP).
// Lives here because middleware.ts conflicts with proxy.ts in this Next.js
// version. For multi-region setups swap for an Upstash Redis store.
// ---------------------------------------------------------------------------
interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>()
const RL_WINDOW = 60_000
const RL_MAX    = 10

function checkRateLimit(ip: string): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const entry = rlStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rlStore.set(ip, { count: 1, resetAt: now + RL_WINDOW })
    return { allowed: true, resetAt: now + RL_WINDOW }
  }
  if (entry.count >= RL_MAX) return { allowed: false, resetAt: entry.resetAt }
  entry.count++
  return { allowed: true, resetAt: entry.resetAt }
}

function getSafeCallbackUrl(value: string | null, request: NextRequest) {
  if (!value) return '/command-center'
  try {
    const target = new URL(value, request.url)
    return target.origin === request.nextUrl.origin
      ? `${target.pathname}${target.search}`
      : '/command-center'
  } catch {
    return '/command-center'
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to auth API routes before anything else.
  if (pathname.startsWith('/api/auth/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'anonymous'
    const { allowed, resetAt } = checkRateLimit(ip)
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RL_MAX),
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      })
    }
  }

  // Skip further checks for API routes, static files, and _next internals.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({ headers: request.headers })
  const isAuthenticated = !!session?.user
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))

  // Redirect authenticated users away from auth pages.
  if (isAuthenticated && isAuthPath) {
    const callbackUrl = getSafeCallbackUrl(
      request.nextUrl.searchParams.get('callbackUrl'),
      request,
    )
    return NextResponse.redirect(new URL(callbackUrl, request.url))
  }

  // Redirect unauthenticated users to sign-in.
  if (!isAuthenticated && isProtectedPath) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
