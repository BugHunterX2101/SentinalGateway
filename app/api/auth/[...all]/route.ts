import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { authRateLimiter, signUpRateLimiter } from '@/lib/rate-limit'
import {
  isVerifiedEmailProvider,
  checkPasswordStrength,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  lockRemainingSeconds,
} from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

const { GET: authGet, POST: authPost } = toNextJsHandler(auth.handler)

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

async function rateLimitedHandler(
  request: NextRequest,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const ip = getClientIp(request)
  const { allowed, resetAt } = await authRateLimiter(`auth:${ip}`)

  if (!allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
      },
    })
  }

  const response = await handler(request)
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
  return response
}

// Better-auth's client surfaces non-2xx JSON as result.error by spreading the
// parsed body, so expose the message under both keys: `message` (the shape
// better-auth's own server uses) and `error` (for direct API consumers).
function jsonResponse(message: string, status: number = 400, extraHeaders: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify({ error: message, message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.clone().json()
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function extractEmail(body: Record<string, unknown> | null): string {
  if (!body) return ''
  const candidate = body.email ?? body.identifier
  return typeof candidate === 'string' ? candidate.trim().toLowerCase() : ''
}

export async function GET(request: NextRequest) {
  return rateLimitedHandler(request, (req) => authGet(req))
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const body = await readBody(request)
  const pathname = request.nextUrl.pathname

  // Honeypot: bots fill hidden fields that real users never see.
  if (body) {
    const honeypot = body.website ?? body.company_website
    if (typeof honeypot === 'string' && honeypot.length > 0) {
      return jsonResponse('Forbidden', 403)
    }
  }

  // Only verified, well-known email providers may register.
  if (pathname.endsWith('/sign-up/email') && body?.name && body?.email) {
    const email = extractEmail(body)
    const providerCheck = await isVerifiedEmailProvider(email)
    if (!providerCheck.ok) {
      return jsonResponse(
        providerCheck.reason ??
          'Sign-ups are restricted to verified email providers. Use a corporate or mainstream email address (e.g. gmail.com, outlook.com).'
      )
    }

    const { allowed, resetAt } = await signUpRateLimiter(`signup:${ip}`)
    if (!allowed) {
      return jsonResponse('Too many accounts created from this address. Try again later.', 429, {
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
      })
    }

    const password = typeof body.password === 'string' ? body.password : ''
    const passwordCheck = checkPasswordStrength(password)
    if (!passwordCheck.ok) {
      return jsonResponse(`Password must include: ${passwordCheck.errors.join(', ')}.`)
    }
  }

  // Lockout: repeated failed sign-ins freeze the account from that address.
  // The key combines email and IP so one attacker cannot lock out a victim's
  // account from a different IP, while still throttling credential guessing.
  if (pathname.endsWith('/sign-in/email')) {
    const email = extractEmail(body)

    if (email) {
      const lockKey = `${email}:${ip}`
      if (isLockedOut(lockKey)) {
        const seconds = lockRemainingSeconds(lockKey)
        return jsonResponse(
          `Too many failed attempts. Account temporarily locked. Try again in ${Math.max(1, Math.ceil(seconds / 60))} minute(s).`,
          423,
          { 'Retry-After': String(Math.max(1, Math.ceil(seconds))) }
        )
      }

      const response = await rateLimitedHandler(request, (req) => authPost(req))
      if (response.status === 401) {
        const remaining = recordFailedAttempt(lockKey)
        return jsonResponse(
          remaining > 0
            ? `Invalid email or password. ${remaining} attempt(s) remaining before temporary lockout.`
            : 'Too many failed attempts. Account temporarily locked.',
          401
        )
      }
      if (response.status === 200) {
        await clearFailedAttempts(lockKey)
      }
      return response
    }
  }

  return rateLimitedHandler(request, (req) => authPost(req))
}

export const runtime = 'nodejs'
export const maxDuration = 30
