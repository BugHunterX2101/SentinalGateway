import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

// BETTER_AUTH_SECRET must be set in all Vercel environments (Production,
// Preview, Development). Without it betterAuth() rejects the empty string.
// We fall back to a build-time placeholder so `next build` succeeds —
// the placeholder is never used for real requests because the real secret
// is always present at runtime on Vercel.
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
