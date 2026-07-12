import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

// Determine environment for cookie settings
// - Local development: http://localhost:3000 needs SameSite: 'lax', Secure: false
// - Preview (v0, Vercel preview): cross-site iframe needs SameSite: 'none', Secure: true
// - Production (Vercel prod): SameSite: 'lax', Secure: true
const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.V0_RUNTIME_URL && !process.env.VERCEL_URL
const isPreview = !!process.env.V0_RUNTIME_URL || (!!process.env.VERCEL_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL)
const isProduction = !!process.env.VERCEL_PROJECT_PRODUCTION_URL

let defaultCookieAttributes: { sameSite: 'lax' | 'none'; secure: boolean }

if (isLocalDev) {
  defaultCookieAttributes = { sameSite: 'lax', secure: false }
} else if (isPreview) {
  defaultCookieAttributes = { sameSite: 'none', secure: true }
} else {
  defaultCookieAttributes = { sameSite: 'lax', secure: true }
}

const baseURL = process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL
        ? process.env.V0_RUNTIME_URL
        : 'http://localhost:3000')

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'local-build-placeholder-secret-32-chars-min',
  database: pool,
  baseURL,
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
    'https://sentinalgateway-ochre.vercel.app',
    'https://*.sentinalgateway*.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
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
    defaultCookieAttributes,
    useSecureCookies: !isLocalDev,
    crossSubDomainCookies: {
      enabled: false,
    },
  },
})