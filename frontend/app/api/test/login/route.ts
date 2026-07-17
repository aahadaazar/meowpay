import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Test-only shortcut (ADR 0011): e2e needs many independently-authenticated humans without
// driving the signup form for each one. This mints a genuine Supabase session — same signature,
// same RLS, same backend JWT verification as a real login. 404s unless E2E_TEST_MODE=true;
// never set that flag outside a test run.
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ message: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 500 });
  }

  const admin = createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError && !createError.message.toLowerCase().includes("already")) {
    return NextResponse.json({ message: createError.message }, { status: 500 });
  }

  // Same call the real login form makes — writes the same session cookies through the same
  // @supabase/ssr cookie adapter.
  const supabase = createServerSupabaseClient();
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (signInError || !sessionData.session) {
    return NextResponse.json({ message: signInError?.message ?? "Could not create the test session." }, { status: 500 });
  }

  return NextResponse.json({
    accessToken: sessionData.session.access_token,
    userId: sessionData.session.user.id,
  });
}
