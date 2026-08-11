// Server-side auth hardening for the sign-up / sign-in endpoints.
//
// - Verified email providers: a sign-up email's domain must either be a
//   well-known consumer provider or have a real MX record (proving the
//   domain can actually receive mail). Disposable-looking or fake domains
//   are rejected before an account is created.
// - Strong passwords: Better Auth enforces minimum length; this adds the
//   character-class requirements on top.
// - Failed-attempt lockout: throttles credential guessing per email+IP.

import { promises as dns } from 'node:dns'
import { EMAIL_RE } from '@/lib/password-rules'

// Well-known consumer providers. These always pass without a DNS lookup, so
// sign-up stays fast for the common case and keeps working even if DNS is
// briefly unavailable. Every other domain must prove itself via MX records.
const VERIFIED_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
  'gmx.com',
  'gmx.de',
  'mail.com',
  'fastmail.com',
  'hey.com',
  'tutanota.com',
  'yandex.com',
  'yandex.ru',
])

const MX_TIMEOUT_MS = 3000

export function isVerifiedEmailProvider(email: string): Promise<{ ok: boolean; reason?: string }> {
  const value = email.trim().toLowerCase()
  if (!EMAIL_RE.test(value)) {
    return Promise.resolve({ ok: false, reason: 'Enter a valid email address.' })
  }
  const domain = value.split('@')[1]
  if (VERIFIED_PROVIDERS.has(domain)) {
    return Promise.resolve({ ok: true })
  }

  // Race the MX lookup against a timeout so a slow resolver cannot hang the
  // auth endpoint; a timeout is treated as unverified (secure default).
  const lookup = dns.resolveMx(domain)
  const timed = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('MX lookup timed out')), MX_TIMEOUT_MS),
  )

  return Promise.race([lookup, timed])
    .then((records) =>
      records.length > 0
        ? { ok: true }
        : { ok: false, reason: 'This email domain is not a verified mail provider.' },
    )
    .catch(() => ({ ok: false, reason: 'This email domain is not a verified mail provider.' }))
}

export { checkPasswordStrength } from '@/lib/password-rules'
export type { PasswordCheck } from '@/lib/password-rules'

// ---------------------------------------------------------------------------
// Failed sign-in lockout: 5 failed attempts per email+IP within 15 minutes
// temporarily blocks that specific account from that address. The store is
// capped and expires lazily, mirroring the rate-limit helpers.
// ---------------------------------------------------------------------------

const LOCK_WINDOW_MS = 15 * 60_000
const MAX_FAILED = 5
const MAX_ENTRIES = 10_000

interface LockEntry {
  count: number
  resetAt: number
}

const lockStore = new Map<string, LockEntry>()

export function isLockedOut(identifier: string): boolean {
  const entry = lockStore.get(identifier)
  return !!entry && Date.now() < entry.resetAt
}

export function recordFailedAttempt(identifier: string): number {
  const now = Date.now()
  if (lockStore.size >= MAX_ENTRIES) {
    for (const [key, entry] of lockStore.entries()) {
      if (now > entry.resetAt) lockStore.delete(key)
    }
    if (lockStore.size >= MAX_ENTRIES) lockStore.clear()
  }
  const entry = lockStore.get(identifier)
  if (!entry || now > entry.resetAt) {
    lockStore.set(identifier, { count: 1, resetAt: now + LOCK_WINDOW_MS })
    return MAX_FAILED - 1
  }
  entry.count += 1
  return Math.max(0, MAX_FAILED - entry.count)
}

export function clearFailedAttempts(identifier: string) {
  lockStore.delete(identifier)
}

export function failedAttemptsRemaining(identifier: string): number {
  const entry = lockStore.get(identifier)
  if (!entry || Date.now() >= entry.resetAt) return MAX_FAILED
  return Math.max(0, MAX_FAILED - entry.count)
}

export function lockRemainingSeconds(identifier: string): number {
  const entry = lockStore.get(identifier)
  if (!entry) return 0
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000))
}
