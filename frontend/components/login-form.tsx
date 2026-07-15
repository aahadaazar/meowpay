"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim();
    const normalizedDisplayName = displayName.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!normalizedDisplayName) {
      setError("Tell us your display name.");
      return;
    }

    setIsSubmitting(true);
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        data: { display_name: normalizedDisplayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setNotice("Check your email for your secure sign-in link.");
  }

  return (
    <form className="product-mockup-card grid gap-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="text-title-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="text-title-sm font-semibold" htmlFor="display-name">
          Display name
        </label>
        <input
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground"
          id="display-name"
          name="display-name"
          onChange={(event) => setDisplayName(event.target.value)}
          type="text"
          value={displayName}
        />
      </div>
      {error ? <p className="text-body-sm text-destructive" role="alert">{error}</p> : null}
      {notice ? <p className="text-body-sm text-body" role="status">{notice}</p> : null}
      <button className="button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending link…" : "Send magic link"}
      </button>
    </form>
  );
}
