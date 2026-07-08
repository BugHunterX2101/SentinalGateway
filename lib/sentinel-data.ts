// Mock data modeling the Sentinel Gateway domain described in the PRD /
// Technical / Design documents: services (nodes), traffic flows (edges),
// anomaly signals, adaptive traffic-shaping policies, circuit-breaker state,
// and the explainable "decision" trail for each automated action.

export type NodeHealth = 'healthy' | 'degraded' | 'critical' | 'quarantined'
export type CircuitState = 'closed' | 'half-open' | 'open'

export interface ServiceNode {
  id: string
  name: string
  group: string
  health: NodeHealth
  circuit: CircuitState
  // normalized 0-1 grid position for the "Nervous System Map"
  x: number
  y: number
  rps: number
  p99: number // ms
  errorRate: number // percent
  anomalyScore: number // 0-100, model confidence something is wrong
}

export interface TrafficEdge {
  from: string
  to: string
  volume: number // relative thickness
  latency: number // ms
  status: 'nominal' | 'shaped' | 'throttled' | 'severed'
}

export const serviceNodes: ServiceNode[] = [
  { id: 'edge', name: 'Edge Ingress', group: 'Ingress', health: 'healthy', circuit: 'closed', x: 0.08, y: 0.5, rps: 48200, p99: 34, errorRate: 0.12, anomalyScore: 4 },
  { id: 'authz', name: 'Auth / Identity', group: 'Platform', health: 'healthy', circuit: 'closed', x: 0.3, y: 0.22, rps: 22400, p99: 41, errorRate: 0.21, anomalyScore: 9 },
  { id: 'catalog', name: 'Catalog API', group: 'Commerce', health: 'healthy', circuit: 'closed', x: 0.3, y: 0.5, rps: 18900, p99: 58, errorRate: 0.4, anomalyScore: 12 },
  { id: 'search', name: 'Search API', group: 'Commerce', health: 'degraded', circuit: 'half-open', x: 0.52, y: 0.28, rps: 15600, p99: 212, errorRate: 3.8, anomalyScore: 71 },
  { id: 'cart', name: 'Cart Service', group: 'Commerce', health: 'healthy', circuit: 'closed', x: 0.52, y: 0.62, rps: 9800, p99: 62, errorRate: 0.6, anomalyScore: 18 },
  { id: 'payments', name: 'Payments', group: 'Commerce', health: 'critical', circuit: 'open', x: 0.74, y: 0.36, rps: 4200, p99: 940, errorRate: 22.4, anomalyScore: 96 },
  { id: 'inventory', name: 'Inventory', group: 'Fulfillment', health: 'degraded', circuit: 'closed', x: 0.74, y: 0.68, rps: 7100, p99: 148, errorRate: 2.1, anomalyScore: 44 },
  { id: 'notify', name: 'Notifications', group: 'Platform', health: 'healthy', circuit: 'closed', x: 0.92, y: 0.5, rps: 5400, p99: 38, errorRate: 0.3, anomalyScore: 7 },
]

export const trafficEdges: TrafficEdge[] = [
  { from: 'edge', to: 'authz', volume: 8, latency: 41, status: 'nominal' },
  { from: 'edge', to: 'catalog', volume: 9, latency: 58, status: 'nominal' },
  { from: 'authz', to: 'search', volume: 6, latency: 212, status: 'shaped' },
  { from: 'catalog', to: 'search', volume: 5, latency: 212, status: 'shaped' },
  { from: 'catalog', to: 'cart', volume: 6, latency: 62, status: 'nominal' },
  { from: 'cart', to: 'payments', volume: 4, latency: 940, status: 'severed' },
  { from: 'cart', to: 'inventory', volume: 5, latency: 148, status: 'throttled' },
  { from: 'inventory', to: 'notify', volume: 3, latency: 38, status: 'nominal' },
  { from: 'payments', to: 'notify', volume: 2, latency: 38, status: 'nominal' },
]

export interface AnomalySignal {
  id: string
  service: string
  serviceLabel: string
  metric: string
  baseline: string
  observed: string
  severity: 'info' | 'warning' | 'critical'
  confidence: number
  detectedAt: string
  action: string
}

export const anomalySignals: AnomalySignal[] = [
  {
    id: 'anm-8842',
    service: 'payments',
    serviceLabel: 'Payments',
    metric: 'Error rate',
    baseline: '0.4%',
    observed: '22.4%',
    severity: 'critical',
    confidence: 96,
    detectedAt: '12s ago',
    action: 'Circuit opened, failing over to retry buffer',
  },
  {
    id: 'anm-8830',
    service: 'search',
    serviceLabel: 'Search API',
    metric: 'p99 latency',
    baseline: '60ms',
    observed: '212ms',
    severity: 'warning',
    confidence: 71,
    detectedAt: '48s ago',
    action: 'Adaptive shaping: shed 18% low-priority traffic',
  },
  {
    id: 'anm-8817',
    service: 'inventory',
    serviceLabel: 'Inventory',
    metric: 'Saturation',
    baseline: '55%',
    observed: '89%',
    severity: 'warning',
    confidence: 44,
    detectedAt: '2m ago',
    action: 'Throttling write-heavy clients to protect headroom',
  },
  {
    id: 'anm-8790',
    service: 'authz',
    serviceLabel: 'Auth / Identity',
    metric: 'Token churn',
    baseline: 'normal',
    observed: '+3.1σ',
    severity: 'info',
    confidence: 9,
    detectedAt: '6m ago',
    action: 'Observing — below intervention threshold',
  },
]

// Sparkline series (relative values) for headline metrics
export const rpsSeries = [38, 41, 39, 44, 47, 45, 49, 52, 48, 51, 55, 53, 58, 54, 60]
export const latencySeries = [42, 44, 41, 46, 58, 61, 70, 92, 140, 188, 212, 205, 180, 150, 132]
export const errorSeries = [0.3, 0.4, 0.3, 0.5, 0.4, 0.6, 1.2, 3.8, 9.1, 15.4, 22.4, 20.1, 14.8, 8.2, 5.1]

export const kpis = [
  { label: 'Requests / sec', value: '48,240', delta: '+6.2%', trend: 'up', series: rpsSeries, accent: 'cyan' as const },
  { label: 'Global p99', value: '132 ms', delta: '+41 ms', trend: 'up', series: latencySeries, accent: 'amber' as const },
  { label: 'Error rate', value: '5.1%', delta: '+4.7 pts', trend: 'up', series: errorSeries, accent: 'coral' as const },
  { label: 'Auto-mitigations', value: '3 active', delta: '2 resolved', trend: 'flat', series: [1, 1, 2, 2, 2, 3, 3, 4, 5, 4, 4, 3, 3, 3, 3], accent: 'indigo' as const },
]

// Adaptive traffic-shaping policies for the Flow Canvas screen
export interface ShapingPolicy {
  id: string
  name: string
  target: string
  strategy: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  budget: number // percent of capacity
  state: 'active' | 'standby' | 'learning'
  description: string
}

export const shapingPolicies: ShapingPolicy[] = [
  { id: 'pol-01', name: 'Checkout protection', target: 'Cart → Payments', strategy: 'Priority lane + retry budget', priority: 'P0', budget: 100, state: 'active', description: 'Guarantees capacity for revenue-critical checkout traffic even under load.' },
  { id: 'pol-02', name: 'Search load-shed', target: 'Search API', strategy: 'Adaptive concurrency limit', priority: 'P2', budget: 62, state: 'active', description: 'Sheds low-value crawler and prefetch traffic when p99 breaches SLO.' },
  { id: 'pol-03', name: 'Inventory fairness', target: 'Inventory', strategy: 'Weighted fair queueing', priority: 'P1', budget: 80, state: 'active', description: 'Prevents any single tenant from starving the write path.' },
  { id: 'pol-04', name: 'Notification deferral', target: 'Notifications', strategy: 'Async spill to queue', priority: 'P3', budget: 40, state: 'standby', description: 'Defers non-urgent notifications during incidents to reclaim headroom.' },
  { id: 'pol-05', name: 'Auth burst absorb', target: 'Auth / Identity', strategy: 'Token-bucket smoothing', priority: 'P1', budget: 90, state: 'learning', description: 'Learning normal login bursts to distinguish spikes from credential attacks.' },
]

// Decision trace for the Decision Explainer / X-Ray Inspector screen
export interface DecisionStep {
  step: number
  title: string
  detail: string
  weight: number // contribution to the decision (0-100)
  kind: 'signal' | 'reasoning' | 'action'
}

export const decisionTrace: DecisionStep[] = [
  { step: 1, title: 'Error-rate breach detected', detail: 'Payments error rate jumped from 0.4% baseline to 22.4% over a 40s window — 6.1σ above the learned seasonal envelope.', weight: 42, kind: 'signal' },
  { step: 2, title: 'Latency correlation', detail: 'p99 latency for Payments climbed to 940ms simultaneously, ruling out a pure client-side error pattern.', weight: 24, kind: 'signal' },
  { step: 3, title: 'Blast-radius estimate', detail: 'Dependency graph shows Cart → Payments as the only inbound edge; opening the circuit isolates 1 upstream, protecting Cart and Checkout.', weight: 18, kind: 'reasoning' },
  { step: 4, title: 'Retry-storm risk', detail: 'Client retry budget nearly exhausted; continued forwarding would amplify load and delay recovery of the downstream pool.', weight: 11, kind: 'reasoning' },
  { step: 5, title: 'Circuit opened', detail: 'Sentinel opened the Payments circuit and routed traffic to the retry buffer with exponential backoff. Half-open probe scheduled in 30s.', weight: 5, kind: 'action' },
]

export const decisionMeta = {
  id: 'dec-9f21c4',
  headline: 'Opened circuit breaker for Payments',
  outcome: 'Contained' as const,
  confidence: 96,
  latencyToDecide: '840ms',
  model: 'Sentinel Anomaly Engine v4 · seasonal + graph-aware',
  requestsProtected: '312,000',
  timestamp: 'Today, 14:22:07 UTC',
}

export const featureHighlights = [
  {
    title: 'Real-time anomaly detection',
    body: 'A streaming model learns each service’s seasonal envelope and flags deviations in milliseconds — no static thresholds to tune.',
    accent: 'cyan' as const,
  },
  {
    title: 'Adaptive traffic shaping',
    body: 'Priority lanes, fair queueing, and load-shedding rebalance in real time so revenue-critical traffic never starves under load.',
    accent: 'amber' as const,
  },
  {
    title: 'Self-healing circuit breaking',
    body: 'Graph-aware breakers isolate the smallest possible blast radius, then probe and recover automatically once a service is healthy.',
    accent: 'coral' as const,
  },
  {
    title: 'Glass-box explainability',
    body: 'Every automated decision ships with a step-by-step trace, weighted signals, and a confidence score you can audit and trust.',
    accent: 'indigo' as const,
  },
]
