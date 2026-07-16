import type { BrowserContext } from "@playwright/test";
import { uniqueEmail } from "./ids";

export type TestHuman = {
  email: string;
  displayName: string;
  accessToken: string;
  userId: string;
};

/**
 * Logs a brand-new, uniquely-emailed human into the given browser context via the
 * E2E_TEST_MODE-gated /api/test/login route (see frontend/app/api/test/login/route.ts).
 * It mints a real Supabase session — the route handler's Set-Cookie lands in `context`'s
 * cookie jar because `context.request` shares storage with every page opened from `context`.
 * After this resolves, page.goto("/dashboard") in the same context is already authenticated.
 */
export async function loginAsNewHuman(context: BrowserContext, displayName: string): Promise<TestHuman> {
  const email = uniqueEmail(displayName.toLowerCase().replace(/\s+/g, "-"));

  const response = await context.request.post("/api/test/login", {
    data: { email, displayName },
  });
  if (!response.ok()) {
    throw new Error(`Test login failed (${response.status()}): ${await response.text()}`);
  }

  const { accessToken, userId } = (await response.json()) as { accessToken: string; userId: string };
  return { email, displayName, accessToken, userId };
}
