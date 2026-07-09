'use client'

import { useTransition } from 'react'
import { authClient } from '@/lib/auth-client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut()
      // Hard redirect so the cleared session cookie is reflected on the
      // very next server request — same reason as AuthForm.
      window.location.href = '/sign-in'
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      aria-label="Sign out"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      Sign out
    </button>
  )
}
