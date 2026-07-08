export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-cyan">{eyebrow}</p>
        <h1 className="mt-1.5 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
