const accentColor: Record<string, string> = {
  cyan: 'var(--cyan)',
  amber: 'var(--amber)',
  coral: 'var(--coral)',
  indigo: 'var(--indigo)',
}

export function Sparkline({
  data,
  accent = 'cyan',
  width = 140,
  height = 44,
}: {
  data: number[]
  accent?: 'cyan' | 'amber' | 'coral' | 'indigo'
  width?: number
  height?: number
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((d, i) => {
    const x = i * stepX
    const y = height - ((d - min) / range) * (height - 6) - 3
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const color = accentColor[accent]
  const id = `spark-${accent}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
    </svg>
  )
}
