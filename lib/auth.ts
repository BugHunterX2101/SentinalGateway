import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

type Auth = ReturnType<typeof betterAuth>

// Lazy singleton — betterAuth() is instantiated on the first HTTP request,
// never during `next build` page-data collection. This prevents the
// "BetterAuthError: default secret" crash when BETTER_AUTH_SECRET is absent
// from the build environment.
let _auth: Auth | null = null

function createAuth(): Auth {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is not set. Add it to your Vercel project environment variables ' +
      'for Production, Preview, and Development.'
    )
  }
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
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
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    ...(process.env.NODE_ENV === 'development'
      ? {
          advanced: {
            defaultCookieAttributes: {
              sameSite: 'none' as const,
              secure: true,
            },
          },
        }
      : {}),
  })
}

// Export a proxy so callers use `auth.handler`, `auth.api` etc. unchanged.
// The real instance is created on first property access at runtime.
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = createAuth()
    return (_auth as Record<string | symbol, unknown>)[prop]
  },
})
