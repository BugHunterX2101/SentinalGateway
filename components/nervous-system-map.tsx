'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type NodeHealth, type ServiceNode, useLive } from '@/hooks/use-live'

const healthColor: Record<NodeHealth, string> = {
  healthy: 'var(--cyan)',
  degraded: 'var(--amber)',
  critical: 'var(--coral)',
  quarantined: 'var(--indigo)',
}

const edgeColor: Record<string, string> = {
  nominal: 'rgba(26,35,126,0.28)',
  shaped: 'var(--amber)',
  throttled: 'var(--tangerine)',
  severed: 'var(--coral)',
}

const W = 1000
const H = 560

export function NervousSystemMap({
  interactive = true,
  onSelect,
  selectedId,
}: {
  interactive?: boolean
  onSelect?: (node: ServiceNode) => void
  selectedId?: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const { nodes: serviceNodes, edges: trafficEdges } = useLive()
  const nodeById = Object.fromEntries(serviceNodes.map((n) => [n.id, n]))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label="Sentinel Gateway service dependency map with live traffic flows"
    >
      <defs>
        <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--cyan-glow)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--cyan-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* edges */}
      {trafficEdges.map((edge, i) => {
        const a = nodeById[edge.from]
        const b = nodeById[edge.to]
        if (!a || !b) return null
        const x1 = a.x * W
        const y1 = a.y * H
        const x2 = b.x * W
        const y2 = b.y * H
        const active = hovered === edge.from || hovered === edge.to
        const color = edgeColor[edge.status]
        const severed = edge.status === 'severed'
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={active ? edge.volume * 0.9 : edge.volume * 0.6}
              strokeLinecap="round"
              strokeDasharray={severed ? '2 10' : undefined}
              opacity={severed ? 0.7 : 0.9}
            />
            {!severed && (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 22"
                style={{ animation: `sentinel-dash ${edge.status === 'nominal' ? 14 : 7}s linear infinite` }}
                opacity="0.9"
              />
            )}
          </g>
        )
      })}

      {/* nodes */}
      {serviceNodes.map((node) => {
        const cx = node.x * W
        const cy = node.y * H
        const color = healthColor[node.health]
        const isSelected = selectedId === node.id
        const isHot = node.health === 'critical' || node.health === 'degraded'
        return (
          <g
            key={node.id}
            transform={`translate(${cx}, ${cy})`}
            className={cn(interactive && 'cursor-pointer')}
            onMouseEnter={() => interactive && setHovered(node.id)}
            onMouseLeave={() => interactive && setHovered(null)}
            onClick={() => interactive && onSelect?.(node)}
          >
            {isHot && <circle r="34" fill="url(#node-glow)" className="animate-sentinel-pulse" />}
            <circle
              r={isSelected ? 20 : 16}
              fill="var(--card)"
              stroke={color}
              strokeWidth={isSelected ? 4 : 3}
              style={{ backdropFilter: 'blur(4px)' }}
            />
            <circle r="6" fill={color} className={isHot ? 'animate-sentinel-pulse' : undefined} />
            {node.circuit === 'open' && (
              <circle r="26" fill="none" stroke="var(--coral)" strokeWidth="1.5" strokeDasharray="3 5" />
            )}
            <text
              y="38"
              textAnchor="middle"
              className="fill-foreground text-[13px] font-medium"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {node.name}
            </text>
            <text
              y="54"
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {node.p99}ms · {node.errorRate}%
            </text>
          </g>
        )
      })}
      {serviceNodes.length === 0 && (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          className="fill-muted-foreground text-[18px]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Waiting for live service nodes
        </text>
      )}
    </svg>
  )
}
