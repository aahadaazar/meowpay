import { test, expect } from "@playwright/test";
import { backendURL } from "../fixtures/config";

// M0 — Foundation & scaffolding (docs/milestones/M00-foundation-and-scaffolding.md)
// Verify: both apps boot; the backend rejects an unauthenticated request; the frontend
// renders an empty shell.

test.describe("M0 foundation", () => {
  test("an unauthenticated request to a protected backend endpoint is rejected", async ({ request }) => {
    const response = await request.get(`${backendURL}/api/me`);
    expect(response.status()).toBe(401);
  });

  test("the frontend renders its shell for an unauthenticated visitor", async ({ page }) => {
    await page.goto("/");
    // No session yet, so middleware (updateSession) redirects the root shell to /login.
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.getByRole("heading", { name: "Welcome back to MeowPay" })).toBeVisible();
  });

  test("visiting a protected route while unauthenticated redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
