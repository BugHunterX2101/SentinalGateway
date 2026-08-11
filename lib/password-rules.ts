// Pure password policy shared by the server (lib/security.ts) and the sign-up
// form. Kept free of any Node-only imports so the client bundle can use it.
// Must stay in sync with the Better Auth minPasswordLength in lib/auth.ts.

export const PASSWORD_RULES: { key: string; test: (pw: string) => boolean; label: string }[] = [
  { key: 'length', test: (pw) => pw.length >= 10, label: 'At least 10 characters' },
  { key: 'upper', test: (pw) => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { key: 'lower', test: (pw) => /[a-z]/.test(pw), label: 'One lowercase letter' },
  { key: 'number', test: (pw) => /\d/.test(pw), label: 'One number' },
  { key: 'special', test: (pw) => /[^A-Za-z0-9]/.test(pw), label: 'One special character' },
]

export interface PasswordCheck {
  ok: boolean
  errors: string[]
}

export function checkPasswordStrength(password: string): PasswordCheck {
  const errors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label)
  return { ok: errors.length === 0, errors }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
