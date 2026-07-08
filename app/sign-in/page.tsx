import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Sign In — Sentinel Gateway',
  description: 'Sign in to the Sentinel Gateway control plane',
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/command-center')

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8">
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  )
}
