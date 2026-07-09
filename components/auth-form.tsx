'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { ShieldCheck, Loader2 } from 'lucide-react'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({ email, password, name })
        if (result.error) throw new Error(result.error.message)
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) throw new Error(result.error.message)
      }

      // Give the browser a tick to commit the Set-Cookie header, then do a
      // full hard-navigation so the server RSC re-runs auth.api.getSession()
      // with the freshly written cookie. router.push() alone can race the
      // cookie write in cross-site iframe environments (v0 preview, Vercel
      // preview deployments).
      await new Promise((r) => setTimeout(r, 100))
      router.refresh()
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
    // Keep spinner alive while navigation is in flight.
  }

  return (
    <div className="mx-auto w-full max-w-sm">
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
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
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
