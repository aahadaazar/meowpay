import { defineConfig, devices } from "@playwright/test";
import { baseURL } from "./fixtures/config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
