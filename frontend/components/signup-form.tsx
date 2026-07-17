"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_TAKEN = "That email is already registered. Log in instead.";
const MIN_PASSWORD_LENGTH = 6;

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    // display_name rides user_metadata so the auth.users trigger (0006_new_user_trigger.sql)
    // can copy it onto the humans row.
    const { data, error: authError } = await createClient().auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { display_name: normalizedDisplayName } },
    });

    if (authError) {
      setIsSubmitting(false);
      setError(authError.code === "user_already_exists" ? EMAIL_TAKEN : authError.message);
      return;
    }

    // With email confirmation on, GoTrue hides a duplicate signup behind a success-shaped
    // response with no identities rather than erroring (anti-enumeration).
    if (data.user && data.user.identities?.length === 0) {
      setIsSubmitting(false);
      setError(EMAIL_TAKEN);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="product-mockup-card grid gap-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="text-title-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
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
          autoComplete="nickname"
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground"
          id="display-name"
          name="display-name"
          onChange={(event) => setDisplayName(event.target.value)}
          type="text"
          value={displayName}
        />
      </div>
      <div>
        <label className="text-title-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="new-password"
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-4 text-body-md outline-none focus:border-foreground"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <p className="mt-2 text-body-sm text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>
      {error ? <p className="text-body-sm text-destructive" role="alert">{error}</p> : null}
      <button className="button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
