import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

// The v0 preview renders inside a cross-site iframe, so session cookies must
// be SameSite=None; Secure — otherwise the browser silently drops them and the
// user appears permanently logged out.
//
// We apply the override whenever we're NOT on a real production Vercel
// deployment (i.e. no VERCEL_PROJECT_PRODUCTION_URL *or* there IS a
// V0_RUNTIME_URL, which is always present inside the v0 VM sandbox).
const isPreviewOrDev =
  process.env.NODE_ENV === 'development' ||
  !!process.env.V0_RUNTIME_URL ||
  !process.env.VERCEL_PROJECT_PRODUCTION_URL

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? 'build-time-placeholder-not-used',
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    'https://*.vusercontent.net',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    'https://sentinalgateway.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    // Always use cross-site cookie attributes in preview/dev so the v0 iframe
    // and Vercel preview deployments retain the session cookie.
    defaultCookieAttributes: isPreviewOrDev
      ? { sameSite: 'none' as const, secure: true }
      : { sameSite: 'lax' as const, secure: true },
    // Use a consistent cookie prefix so middleware can find it reliably.
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: false,
    },
  },
})
