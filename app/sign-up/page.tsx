import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Create Account — Sentinel Gateway',
  description: 'Register an operator account for Sentinel Gateway',
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/command-center')

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 p-8 shadow-xl backdrop-blur-md">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}
