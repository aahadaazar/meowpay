export default function DashboardLoading() {
  return <main aria-busy="true" aria-label="Loading dashboard" className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    <div className="mx-auto grid max-w-7xl gap-8 animate-pulse"><div className="h-8 w-40 rounded-md bg-surface-card" /><div className="h-52 rounded-xl bg-surface-card" /><div className="grid gap-4 md:grid-cols-2"><div className="h-32 rounded-lg bg-surface-card" /><div className="h-32 rounded-lg bg-surface-card" /></div><div className="h-72 rounded-lg bg-surface-card" /></div>
  </main>;
}
