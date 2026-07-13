import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that require authentication
const protectedPaths = ['/command-center', '/flow-canvas', '/decisions']

// Paths that should redirect authenticated users away
const authPaths = ['/sign-in', '/sign-up']

function getSafeCallbackUrl(value: string | null, request: NextRequest) {
  if (!value) return '/command-center'

  try {
    const target = new URL(value, request.url)
    return target.origin === request.nextUrl.origin ? `${target.pathname}${target.search}` : '/command-center'
  } catch {
    return '/command-center'
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip proxy for API routes, static files, and _next
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isAuthenticated = !!session?.user
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPath) {
    const callbackUrl = getSafeCallbackUrl(request.nextUrl.searchParams.get('callbackUrl'), request)
    return NextResponse.redirect(new URL(callbackUrl, request.url))
  }

  // Redirect unauthenticated users to sign-in
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
