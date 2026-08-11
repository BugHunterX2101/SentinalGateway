// Shared loading skeleton for the dashboard routes. Shown instantly during
// client-side navigation while the target route streams its server-rendered
// content, so page switches feel immediate instead of waiting on the DB.
export function RouteLoading() {
  return (
    <main className="relative z-10 min-h-dvh pb-16">
      <header className="sticky top-0 z-50 px-4 pt-4">
        <div className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-lg bg-secondary" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-secondary" />
          </div>
          <div className="hidden h-8 w-48 animate-pulse rounded-full bg-secondary md:block" />
        </div>
      </header>

      <div className="mx-4 my-4 flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-2 backdrop-blur sm:mx-auto sm:max-w-7xl">
        <div className="flex items-center gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-16 animate-pulse rounded-full bg-secondary" />
          ))}
        </div>
        <div className="h-3 w-10 animate-pulse rounded-full bg-secondary" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-10">
        <div className="h-3 w-32 animate-pulse rounded-full bg-cyan/30" />
        <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded-xl bg-secondary" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-secondary" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass h-36 animate-pulse rounded-2xl" />
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="glass h-[480px] animate-pulse rounded-2xl" />
          <div className="glass h-[480px] animate-pulse rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
