export function SentinelLogo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M16 2.5 4 7.5v8c0 7.2 4.9 12.3 12 14.5 7.1-2.2 12-7.3 12-14.5v-8L16 2.5Z"
          stroke="var(--indigo)"
          strokeWidth="1.6"
          fill="rgba(0,229,255,0.08)"
        />
        <circle cx="16" cy="15" r="3.4" fill="var(--cyan-glow)" />
        <path
          d="M6.5 15h4.2M21.3 15h4.2M16 5.5v3.8M16 20.7v3.8"
          stroke="var(--cyan)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
