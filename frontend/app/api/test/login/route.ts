import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Test-only shortcut (ADR 0011): e2e needs many independently-authenticated humans without
// driving the signup form for each one. It calls the exact same anon-key signUp/signInWithPassword
// API a real browser calls, with the same duplicate-email fallback signup-form.tsx uses — so every
// session it produces is genuinely JWT-valid and subject to the same RLS/backend verification as a
// real login; it just skips the DOM typing/clicking. 404s unless E2E_TEST_MODE=true; never set that
// flag outside a test run.
const TEST_PASSWORD = "e2e-test-password";

export async function POST(request: Request) {
  if (process.env.E2E_TEST_MODE !== "true") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string; displayName?: string } | null;
  const email = body?.email?.trim();
  const displayName = body?.displayName?.trim();
  if (!email || !displayName) {
    return NextResponse.json({ message: "email and displayName are required." }, { status: 400 });
  }

  // Same calls the real signup/login forms make — writes the same session cookies through the
  // same @supabase/ssr cookie adapter.
  const supabase = createServerSupabaseClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: TEST_PASSWORD,
    options: { data: { display_name: displayName } },
  });

  const alreadyRegistered = signUpError?.code === "user_already_exists" || signUpData.user?.identities?.length === 0;
  if (signUpError && !alreadyRegistered) {
    return NextResponse.json({ message: signUpError.message }, { status: 500 });
  }

  let session = signUpData.session;
  if (alreadyRegistered) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password: TEST_PASSWORD });
    if (signInError || !signInData.session) {
      return NextResponse.json({ message: signInError?.message ?? "Could not create the test session." }, { status: 500 });
    }
    session = signInData.session;
  }
  if (!session) {
    return NextResponse.json({ message: "signUp did not return a session — is 'Confirm email' off?" }, { status: 500 });
  }

  return NextResponse.json({
    accessToken: session.access_token,
    userId: session.user.id,
  });
}
