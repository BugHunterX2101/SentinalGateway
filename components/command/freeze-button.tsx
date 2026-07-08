'use client'

import { setFrozen } from '@/lib/live-store'
import { useLive } from '@/hooks/use-live'
import { PauseCircle, PlayCircle } from 'lucide-react'

export function FreezeButton() {
  const { frozen } = useLive()

  return (
    <button
      onClick={() => setFrozen(!frozen)}
      className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      aria-pressed={frozen}
    >
      {frozen ? (
        <>
          <PlayCircle className="h-4 w-4" aria-hidden />
          Resume live
        </>
      ) : (
        <>
          <PauseCircle className="h-4 w-4" aria-hidden />
          Freeze view
        </>
      )}
    </button>
  )
}
