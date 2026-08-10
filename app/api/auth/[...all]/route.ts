import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { authRateLimiter } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const { GET: authGet, POST: authPost } = toNextJsHandler(auth.handler)

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown'
}

async function rateLimitedHandler(
  request: NextRequest,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await authRateLimiter(`auth:${ip}`)

  if (!allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toString(),
      },
    })
  }

  // Mutate the handler's own response instead of re-wrapping it in a new
  // NextResponse — re-wrapping can drop Set-Cookie headers, which would
  // silently break session creation/sign-in.
  const response = await handler(request)
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
  return response
}

export async function GET(request: NextRequest) {
  return rateLimitedHandler(request, authGet as (req: Request) => Promise<Response>)
}

export async function POST(request: NextRequest) {
  return rateLimitedHandler(request, authPost as (req: Request) => Promise<Response>)
}