"use client";

import { useState } from "react";
import type { CatSummary, Me } from "@/lib/api";
import { NewCatDialog } from "@/components/new-cat-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

type CatManagementDashboardProps = {
  me: Me;
  onCreateCat: (name: string) => Promise<CatSummary>;
};

export function CatManagementDashboard({ me, onCreateCat }: CatManagementDashboardProps) {
  const [cats, setCats] = useState(me.cats);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function create(name: string) {
    setIsSubmitting(true);
    setError("");
    try {
      const cat = await onCreateCat(name);
      setCats((currentCats) => [...currentCats, cat]);
      setIsDialogOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "MeowPay could not create that cat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="text-title-md font-semibold" href="/dashboard">MeowPay</a>
          <div className="flex items-center gap-3">
            <span className="hidden text-body-sm text-muted-foreground sm:inline">{me.displayName}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption-uppercase uppercase text-muted-foreground">Your cat wallets</p>
            <h1 className="mt-2 text-display-sm">A treat account for every cat</h1>
          </div>
          <button className="button-primary" onClick={() => setIsDialogOpen(true)} type="button">New cat</button>
        </div>

        {error ? <p className="text-body-sm text-destructive" role="alert">{error}</p> : null}

        {cats.length === 0 ? (
          <section className="product-mockup-card grid justify-items-center gap-4 py-12 text-center">
            <h2 className="text-display-sm">Create your first cat</h2>
            <p className="max-w-md text-body-md text-body">Each cat gets a wallet and 500 welcome treats to begin with.</p>
            <button className="button-primary" onClick={() => setIsDialogOpen(true)} type="button">Create your first cat</button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {cats.map((cat) => (
              <article className="product-mockup-card" key={cat.id}>
                <p className="text-caption-uppercase uppercase text-muted-foreground">Cat wallet</p>
                <h2 className="mt-2 text-title-lg">{cat.name}</h2>
                <p className="mt-8 text-display-sm tabular-nums">{cat.balance.toLocaleString()} treats</p>
              </article>
            ))}
          </section>
        )}
      </section>

      <NewCatDialog
        isOpen={isDialogOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsDialogOpen(false)}
        onCreate={create}
      />
    </main>
  );
}
