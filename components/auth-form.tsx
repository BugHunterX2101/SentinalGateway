'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, Check } from 'lucide-react'
import { checkPasswordStrength, PASSWORD_RULES } from '@/lib/password-rules'

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
  redirectTo?: string
}

export function AuthForm({ mode, redirectTo = '/command-center' }: AuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordCheck = mode === 'sign-up' ? checkPasswordStrength(password) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'sign-up') {
        if (!passwordCheck?.ok) {
          throw new Error('Password does not meet the security requirements below.')
        }
        const result = await authClient.signUp.email({ email, password, name })
        if (result.error) throw new Error(result.error.message)
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) throw new Error(result.error.message)
      }

      // Hard navigation so the session cookie is sent on the very next request.
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Back to home */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to overview
      </Link>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <span className="font-sans text-lg font-semibold tracking-tight text-foreground">
          Sentinel<span className="text-primary">Gateway</span>
        </span>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-foreground">
        {mode === 'sign-in' ? 'Operator sign in' : 'Create operator account'}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {mode === 'sign-in'
          ? 'Access your Sentinel Gateway control plane.'
          : 'Register to manage your gateway control plane.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Honeypot: invisible to humans, irresistible to bots. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {mode === 'sign-up' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@company.com"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {mode === 'sign-up' && (
            <ul className="flex flex-col gap-0.5 pt-1">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password)
                return (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-1.5 text-[11px] ${passed ? 'text-emerald-600' : 'text-muted-foreground'}`}
                  >
                    {passed ? (
                      <Check className="h-3 w-3 shrink-0" aria-hidden />
                    ) : (
                      <span className="h-3 w-3 shrink-0 rounded-full border border-current opacity-60" aria-hidden />
                    )}
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? (
          <>
            No account?{' '}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}