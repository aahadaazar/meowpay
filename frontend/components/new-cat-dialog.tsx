"use client";

import { FormEvent, useState } from "react";

type NewCatDialogProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function NewCatDialog({ isOpen, isSubmitting = false, onClose, onCreate }: NewCatDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Give your cat a name.");
      return;
    }
    setError("");
    await onCreate(normalizedName);
    setName("");
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog">
      <form className="w-full max-w-[420px] rounded-lg border border-border bg-surface-card p-6 dark:bg-card" onSubmit={handleSubmit}>
        <h2 className="text-title-lg">Create a cat wallet</h2>
        <p className="mt-2 text-body-md text-body">New cats start at zero. Fund yours from your wallet once it exists.</p>
        <label className="mt-6 block text-title-sm font-semibold" htmlFor="cat-name">
          Cat name
        </label>
        <input
          autoFocus
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground"
          id="cat-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {error ? <p className="mt-2 text-body-sm text-destructive" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button className="button-secondary" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating…" : "Create cat"}
          </button>
        </div>
      </form>
    </div>
  );
}
