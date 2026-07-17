import { defineConfig, devices } from "@playwright/test";
import { baseURL } from "./fixtures/config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Most specs mint a real human through GoTrue, and the hosted Supabase project rate-limits
  // signups per burst — at the default worker count (one per core) the suite trips it and whole
  // files fail on "Request rate limit reached" rather than on their own assertions. Four workers
  // keeps the signup rate under that ceiling while still running the suite in parallel.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 4,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Assumes `docker compose up --build` (or `npm run dev` + `./gradlew bootRun`) is already
  // running against the live Supabase project in .env — this suite does not boot the stack.
});
