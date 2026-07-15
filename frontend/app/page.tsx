import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="text-title-md font-semibold tracking-normal" href="/">
            MeowPay
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-section px-4 py-section sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-stretch">
          <div className="rounded-xl bg-brand-pink p-6 text-white sm:p-8">
            <p className="text-caption-uppercase uppercase">Total treats</p>
            <h1 className="mt-3 text-display-xl">12,480</h1>
            <p className="mt-4 max-w-2xl text-body-md">
              Shared treat balance across the household, ready for cat wallets,
              transfers, and the activity trail.
            </p>
          </div>

          <div className="product-mockup-card flex flex-col justify-between gap-6">
            <div>
              <p className="text-caption-uppercase uppercase text-muted-foreground">
                This week
              </p>
              <h2 className="mt-3 text-display-sm">Treats moved with room to spare</h2>
            </div>
            <div aria-hidden className="grid grid-cols-5 gap-2">
              <span className="h-11 rounded-sm bg-chart-series-1" />
              <span className="h-11 rounded-sm bg-chart-series-2" />
              <span className="h-11 rounded-sm bg-chart-series-3" />
              <span className="h-11 rounded-sm bg-chart-series-4" />
              <span className="h-11 rounded-sm bg-chart-series-5" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {["Miso", "Juniper", "Taro", "Olive"].map((cat, index) => (
            <article className="product-mockup-card" key={cat}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption-uppercase uppercase text-muted-foreground">
                    Cat wallet
                  </p>
                  <h2 className="mt-2 text-title-lg font-semibold">{cat}</h2>
                </div>
                <span className="rounded-pill bg-surface-card px-3 py-1 text-caption text-foreground dark:bg-muted">
                  Ready
                </span>
              </div>
              <p className="mt-8 text-display-sm tabular-nums">
                {(index + 2) * 420}
              </p>
            </article>
          ))}
        </section>

        <section className="product-mockup-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-caption-uppercase uppercase text-muted-foreground">
                Ledger trail
              </p>
              <h2 className="mt-2 text-title-lg font-semibold">Recent movement</h2>
            </div>
            <div className="h-3 w-40 rounded-pill bg-chart-grid" />
          </div>

          <div className="mt-6 grid gap-3">
            {[
              ["Today", "Miso", "Received", "+240"],
              ["Yesterday", "Juniper", "Sent", "-120"],
              ["Monday", "Taro", "Received", "+90"],
            ].map(([date, cat, direction, amount]) => (
              <div
                className="grid gap-3 border-t border-hairline-soft pt-3 text-body-sm sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center"
                key={`${date}-${cat}`}
              >
                <span className="text-muted-foreground">{date}</span>
                <span className="font-medium text-foreground">{cat}</span>
                <span className="rounded-pill bg-surface-card px-3 py-1 text-caption dark:bg-muted">
                  {direction}
                </span>
                <span className="font-medium tabular-nums">{amount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
