import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/command-center', '/flow-canvas', '/decisions']
const AUTH_ROUTES = ['/sign-in', '/sign-up']

function hasSessionCookie(req: NextRequest): boolean {
  const names = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    '__Host-better-auth.session_token',
  ]
  return names.some((name) => req.cookies.has(name))
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthed = hasSessionCookie(req)

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/command-center', req.url))
    }
    return NextResponse.next()
  }

  if (PROTECTED.some((route) => pathname.startsWith(route)) && !isAuthed) {
    const url = new URL('/sign-in', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
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
