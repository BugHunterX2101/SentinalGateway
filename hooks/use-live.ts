'use client'

import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, type LiveState } from '@/lib/live-store'

// Subscribe to the real-time telemetry engine. Returns the full live state,
// re-rendering the component on every tick.
export function useLive(): LiveState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function formatRelative(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
