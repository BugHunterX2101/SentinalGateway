import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Sign In — Sentinel Gateway',
  description: 'Sign in to the Sentinel Gateway control plane',
}

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (user) redirect('/command-center')

  const { callbackUrl } = await searchParams
  const redirectTo =
    callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') && !callbackUrl.includes('\\')
      ? callbackUrl
      : '/command-center'

  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl p-8">
          <AuthForm mode="sign-in" redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  )
}
