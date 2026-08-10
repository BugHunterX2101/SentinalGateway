// Default baselines for the demo service mesh — keyed by node id.
// Used by: reset action, decision rollback, the live simulation engine,
// and the seed script so every writer agrees on the same numbers.

export interface NodeBaseline {
  rps: string
  p99: string
  errorRate: string
  layer: string
  name: string
  upstream: string[]
}

export const BASELINES: Record<string, NodeBaseline> = {
  edge:      { name: 'Edge Gateway',     layer: 'Edge',     rps: '48200', p99: '34',  errorRate: '0.12', upstream: ['authz', 'catalog'] },
  authz:     { name: 'Auth Service',     layer: 'Auth',     rps: '22400', p99: '41',  errorRate: '0.21', upstream: ['edge'] },
  catalog:   { name: 'Catalog Service',  layer: 'Core',     rps: '18900', p99: '58',  errorRate: '0.4',  upstream: ['edge'] },
  search:    { name: 'Search Service',   layer: 'Core',     rps: '15600', p99: '60',  errorRate: '0.5',  upstream: ['catalog'] },
  cart:      { name: 'Cart Service',     layer: 'Core',     rps: '9800',  p99: '62',  errorRate: '0.6',  upstream: ['authz'] },
  payments:  { name: 'Payments Service', layer: 'Critical', rps: '9200',  p99: '48',  errorRate: '0.4',  upstream: ['cart'] },
  inventory: { name: 'Inventory Sync',   layer: 'Data',     rps: '7100',  p99: '31',  errorRate: '0.3',  upstream: ['catalog'] },
  notify:    { name: 'Notifications',    layer: 'Data',     rps: '5400',  p99: '22',  errorRate: '0.1',  upstream: ['edge'] },
}

export function baselineFor(nodeId: string): NodeBaseline | undefined {
  return BASELINES[nodeId]
}
