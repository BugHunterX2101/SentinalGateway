import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED = ['/command-center', '/flow-canvas', '/decisions']

// Routes only for unauthenticated users (redirect to app if already signed in)
const AUTH_ROUTES = ['/sign-in', '/sign-up']

// better-auth stores the session in a cookie named "better-auth.session_token"
// We do a lightweight cookie presence check here — the full session validation
// still happens in each page's server component via auth.api.getSession().
function hasSessionCookie(req: NextRequest): boolean {
  return (
    req.cookies.has('better-auth.session_token') ||
    req.cookies.has('__Secure-better-auth.session_token')
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthed = hasSessionCookie(req)

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/command-center', req.url))
    }
    return NextResponse.next()
  }

  // Redirect unauthenticated users away from protected pages
  if (PROTECTED.some((r) => pathname.startsWith(r))) {
    if (!isAuthed) {
      const url = new URL('/sign-in', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/command-center/:path*',
    '/flow-canvas/:path*',
    '/decisions/:path*',
    '/sign-in',
    '/sign-up',
  ],
}
