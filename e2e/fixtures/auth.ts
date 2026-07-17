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
  return login(context, email, displayName);
}

const FIXED_HUMANS = {
  A: { email: "e2e-fixed-human-a@meowpay.test", displayName: "Fixed Human A" },
  B: { email: "e2e-fixed-human-b@meowpay.test", displayName: "Fixed Human B" },
} as const;

/**
 * Logs in one of two permanent, reused accounts instead of minting a new one — signup/login is
 * frictionless now (no magic-link rate limit), so most tests no longer need a never-before-used
 * human, only an *isolated* one. `/api/test/login` already tolerates a repeat email (it swallows
 * "already exists" and just signs in), so no route change was needed to support this.
 *
 * Only safe for a test whose assertions are scoped to a specific cat/transfer by its own unique
 * name (`catBalance`, a dropdown option, a named chart entry). Never use it for a test that reads
 * the account-wide total hero (`totalHeroAmount`) or the unscoped `ledgerRowByCounterparty`
 * locator — `playwright.config.ts` runs `fullyParallel`, so another worker can be acting on the
 * same fixed account at the same moment, and an account-wide read has no way to tell its own
 * change from a concurrent one. See e2e/README.md "Test data".
 */
export async function loginAsFixedHuman(context: BrowserContext, slot: keyof typeof FIXED_HUMANS): Promise<TestHuman> {
  const { email, displayName } = FIXED_HUMANS[slot];
  return login(context, email, displayName);
}

async function login(context: BrowserContext, email: string, displayName: string): Promise<TestHuman> {
  const response = await context.request.post("/api/test/login", {
    data: { email, displayName },
  });
  if (!response.ok()) {
    throw new Error(`Test login failed (${response.status()}): ${await response.text()}`);
  }

  const { accessToken, userId } = (await response.json()) as { accessToken: string; userId: string };
  return { email, displayName, accessToken, userId };
}
