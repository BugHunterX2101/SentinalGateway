import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Create Account — Sentinel Gateway',
  description: 'Register an operator account for Sentinel Gateway',
}

export default async function SignUpPage() {
  const user = await getCurrentUser()
  if (user) redirect('/command-center')

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8">
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </main>
  )
}
