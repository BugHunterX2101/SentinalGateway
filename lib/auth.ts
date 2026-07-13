import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

const isLocalDev =
  process.env.NODE_ENV === 'development' && !process.env.V0_RUNTIME_URL && !process.env.VERCEL_URL
const isPreview =
  !!process.env.V0_RUNTIME_URL || (!!process.env.VERCEL_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL)

const defaultCookieAttributes = isLocalDev
  ? { sameSite: 'lax' as const, secure: false }
  : isPreview
    ? { sameSite: 'none' as const, secure: true }
    : { sameSite: 'lax' as const, secure: true }

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000')

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? 'local-build-placeholder-secret-32-chars-min',
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
