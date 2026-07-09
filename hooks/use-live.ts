'use client'

import { useSyncExternalStore, useEffect, useState } from 'react'
import { subscribe, getSnapshot, getInitialSnapshot, type LiveState } from '@/lib/live-store'

// Subscribe to the real-time telemetry engine. Returns the full live state,
// re-rendering the component on every tick. SSR uses a frozen initial snapshot
// so server and client render identically; the live timer takes over after mount.
export function useLive(): LiveState {
  return useSyncExternalStore(subscribe, getSnapshot, getInitialSnapshot)
}

// Subscribe to the SSE stream from the server and apply DB node/policy health
// overrides on top of the client simulation. Returns the merged live state.
export function useLiveWithDb(): LiveState {
  const sim = useLive()
  const [dbOverride, setDbOverride] = useState<{
    nodes?: Array<{ id: string; health: string; circuit: string; anomalyScore: string }>
    policies?: Array<{ id: string; load: string; state: string; budget: string }>
  }>({})

  useEffect(() => {
    const es = new EventSource('/api/telemetry/stream')
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setDbOverride(data)
      } catch {
        // ignore parse errors
      }
    }
    return () => es.close()
  }, [])

  if (!dbOverride.nodes && !dbOverride.policies) return sim

  const nodes = sim.nodes.map((simNode) => {
    const dbNode = dbOverride.nodes?.find((n) => n.id === simNode.id)
    if (!dbNode) return simNode
    return {
      ...simNode,
      health: dbNode.health as typeof simNode.health,
      circuit: dbNode.circuit as typeof simNode.circuit,
      anomalyScore: Number(dbNode.anomalyScore),
    }
  })

  const policies = sim.policies.map((simPolicy) => {
    const dbPolicy = dbOverride.policies?.find((p) => p.id === simPolicy.id)
    if (!dbPolicy) return simPolicy
    return {
      ...simPolicy,
      load: Number(dbPolicy.load),
      state: dbPolicy.state as typeof simPolicy.state,
      budget: Number(dbPolicy.budget),
    }
  })

  return { ...sim, nodes, policies }
}

export function formatRelative(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
