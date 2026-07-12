'use client'

import { useSyncExternalStore } from 'react'

export type NodeHealth = 'healthy' | 'degraded' | 'critical' | 'quarantined'
export type CircuitState = 'closed' | 'half-open' | 'open'

export interface ServiceNode {
  id: string
  name: string
  group: string
  health: NodeHealth
  circuit: CircuitState
  x: number
  y: number
  rps: number
  p99: number
  errorRate: number
  anomalyScore: number
}

export interface TrafficEdge {
  from: string
  to: string
  volume: number
  latency: number
  status: 'nominal' | 'shaped' | 'throttled' | 'severed'
}

export interface AnomalySignal {
  id: string
  service: string
  serviceLabel: string
  metric: string
  baseline: string
  observed: string
  severity: 'info' | 'warning' | 'critical'
  confidence: number
  detectedAt: number
  action: string
}

export interface LivePolicy {
  id: string
  name: string
  target: string
  strategy: string
  priority: string
  budget: number
  state: string
  description?: string
  load: number
}

export interface LiveState {
  tick: number
  startedAt: number
  nodes: ServiceNode[]
  edges: TrafficEdge[]
  kpis: {
    rps: number
    p99: number
    errorRate: number
    mitigations: number
  }
  series: {
    rps: number[]
    latency: number[]
    error: number[]
    mitigations: number[]
  }
  anomalies: AnomalySignal[]
  policies: LivePolicy[]
  decisionConfidence: number
  requestsProtected: number
  frozen: false
}

type DbNode = {
  id: string
  name: string
  layer: string
  health: string
  circuit: string
  rps: string | number
  p99: string | number
  errorRate: string | number
  anomalyScore: string | number
  upstream?: string[] | null
}

type DbPolicy = {
  id: string
  name: string
  target: string
  strategy: string
  budget: string | number
  priority: string
  state: string
  load: string | number
}

type TelemetryPayload = {
  nodes?: DbNode[]
  policies?: DbPolicy[]
}

const SERIES_LEN = 48

const emptyState: LiveState = {
  tick: 0,
  startedAt: 0,
  nodes: [],
  edges: [],
  kpis: { rps: 0, p99: 0, errorRate: 0, mitigations: 0 },
  series: { rps: [], latency: [], error: [], mitigations: [] },
  anomalies: [],
  policies: [],
  decisionConfidence: 0,
  requestsProtected: 0,
  frozen: false,
}

let state = emptyState
let eventSource: EventSource | null = null
let subscribers = 0
const listeners = new Set<() => void>()

function toNumber(value: string | number | undefined, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asHealth(value: string): NodeHealth {
  if (value === 'degraded' || value === 'critical' || value === 'quarantined') return value
  return 'healthy'
}

function asCircuit(value: string): CircuitState {
  if (value === 'half-open' || value === 'open') return value
  return 'closed'
}

function edgeStatus(node: ServiceNode): TrafficEdge['status'] {
  if (node.circuit === 'open') return 'severed'
  if (node.health === 'critical') return 'throttled'
  if (node.health === 'degraded') return 'shaped'
  return 'nominal'
}

function nextSeries(values: number[], value: number) {
  return [...values, value].slice(-SERIES_LEN)
}

function layoutPoint(index: number, total: number) {
  if (total <= 1) return { x: 0.5, y: 0.5 }
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2
  return {
    x: 0.5 + Math.cos(angle) * 0.38,
    y: 0.5 + Math.sin(angle) * 0.34,
  }
}

function aggregate(nodes: ServiceNode[]) {
  const rps = nodes.reduce((sum, node) => sum + node.rps, 0)
  const p99 = rps
    ? Math.round(nodes.reduce((sum, node) => sum + node.p99 * node.rps, 0) / rps)
    : 0
  const activeNodes = nodes.filter((node) => node.circuit !== 'open')
  const activeRps = activeNodes.reduce((sum, node) => sum + node.rps, 0)
  const errorRate = activeRps
    ? Number(
        (
          activeNodes.reduce((sum, node) => sum + node.errorRate * node.rps, 0) / activeRps
        ).toFixed(2),
      )
    : 0

  return {
    rps: Math.round(rps),
    p99,
    errorRate,
    mitigations: nodes.filter((node) => node.circuit !== 'closed').length,
  }
}

function anomaliesFrom(nodes: ServiceNode[], now: number): AnomalySignal[] {
  return nodes
    .filter((node) => node.health !== 'healthy' || node.anomalyScore >= 40)
    .map((node) => {
      const severity =
        node.health === 'critical' || node.anomalyScore >= 80
          ? 'critical'
          : node.health === 'degraded' || node.anomalyScore >= 40
            ? 'warning'
            : 'info'
      const metric = node.errorRate >= 5 ? 'Error rate' : 'p99 latency'
      return {
        id: `${node.id}-${node.health}-${node.circuit}`,
        service: node.id,
        serviceLabel: node.name,
        metric,
        baseline: 'current baseline',
        observed: metric === 'Error rate' ? `${node.errorRate}%` : `${node.p99}ms`,
        severity,
        confidence: Math.round(node.anomalyScore),
        detectedAt: now,
        action:
          node.circuit === 'open'
            ? 'Circuit is open according to live service state.'
            : node.health === 'degraded'
              ? 'Live service state indicates adaptive mitigation is active.'
              : 'Live service state requires operator attention.',
      }
    })
}

function applyPayload(payload: TelemetryPayload) {
  const now = Date.now()
  const rows = payload.nodes ?? []
  const nodes = rows.map((row, index) => {
    const point = layoutPoint(index, rows.length)
    return {
      id: row.id,
      name: row.name,
      group: row.layer,
      health: asHealth(row.health),
      circuit: asCircuit(row.circuit),
      x: point.x,
      y: point.y,
      rps: toNumber(row.rps),
      p99: toNumber(row.p99),
      errorRate: toNumber(row.errorRate),
      anomalyScore: toNumber(row.anomalyScore),
    }
  })

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const edges = rows.flatMap((row) =>
    (row.upstream ?? [])
      .filter((upstream) => nodeById.has(upstream) && nodeById.has(row.id))
      .map((upstream) => {
        const node = nodeById.get(row.id)!
        return {
          from: upstream,
          to: row.id,
          volume: Math.max(1, Math.min(10, node.rps / 5000)),
          latency: node.p99,
          status: edgeStatus(node),
        }
      }),
  )

  const policies = (payload.policies ?? []).map((policy) => ({
    id: policy.id,
    name: policy.name,
    target: policy.target,
    strategy: policy.strategy,
    priority: policy.priority,
    budget: toNumber(policy.budget),
    state: policy.state,
    load: toNumber(policy.load),
  }))

  const kpis = aggregate(nodes)
  const elapsedSeconds = state.startedAt ? Math.max(0, (now - state.startedAt) / 1000) : 0
  state = {
    tick: state.tick + 1,
    startedAt: state.startedAt || now,
    nodes,
    edges,
    kpis,
    series: {
      rps: nextSeries(state.series.rps, kpis.rps / 1000),
      latency: nextSeries(state.series.latency, kpis.p99),
      error: nextSeries(state.series.error, kpis.errorRate),
      mitigations: nextSeries(state.series.mitigations, kpis.mitigations),
    },
    anomalies: anomaliesFrom(nodes, now),
    policies,
    decisionConfidence: Math.round(Math.max(0, ...nodes.map((node) => node.anomalyScore))),
    requestsProtected: Math.round(kpis.rps * elapsedSeconds),
    frozen: false,
  }

  listeners.forEach((listener) => listener())
}

const publicPaths = ['/sign-in', '/sign-up']
let isAuthenticated = typeof window !== 'undefined' ? !publicPaths.includes(window.location.pathname) : true
let isConnecting = false

async function loadSnapshot(): Promise<boolean> {
  const response = await fetch('/api/telemetry/snapshot', { cache: 'no-store' })
  if (response.status === 401) {
    isAuthenticated = false
    return false
  }
  if (!response.ok) return true
  applyPayload(await response.json())
  return true
}

function start() {
  if (eventSource || isConnecting || typeof window === 'undefined' || !isAuthenticated) return
  isConnecting = true

  void loadSnapshot().then((authenticated) => {
    if (!authenticated) {
      isConnecting = false
      return
    }

    eventSource = new EventSource('/api/telemetry/stream')
    eventSource.onmessage = (event) => {
      try {
        applyPayload(JSON.parse(event.data))
      } catch {
        // Ignore malformed stream events.
      }
    }
    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      isConnecting = false
    }
  }).catch(() => {
    isConnecting = false
  })
}

function stop() {
  eventSource?.close()
  eventSource = null
  isConnecting = false
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  subscribers += 1
  start()

  return () => {
    listeners.delete(listener)
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0) stop()
  }
}

export function useLive(): LiveState {
  return useSyncExternalStore(subscribe, () => state, () => emptyState)
}

export const useLiveWithDb = useLive

export function formatRelative(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
