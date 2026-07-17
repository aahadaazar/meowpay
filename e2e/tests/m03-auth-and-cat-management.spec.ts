import { test, expect } from "@playwright/test";
import { loginAsFixedHuman, loginAsNewHuman } from "../fixtures/auth";
import { baseURL } from "../fixtures/config";
import { catBalance, catCard, createCat, gotoDashboard } from "../fixtures/dashboard-page";
import { uniqueCatName, uniqueEmail } from "../fixtures/ids";

// M3 — Auth & cat management (docs/milestones/M03-auth-and-cat-management.md)
// ADRs: 0011 (auth boundary), 0012 (RLS ownership subquery)
// Verify: one human creates two cats; both appear on the dashboard. M12 (ADR 0023) removed the
// welcome grant, so a new cat starts at 0 and is funded from its human's wallet instead.
// (Unauthenticated redirect-to-/login is covered by m00-foundation.spec.ts.)

const TEST_PASSWORD = "correct-horse-battery";

test.describe("signup and login forms", () => {
  test("rejects an invalid email on signup", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#display-name").fill("Alice");
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
  });

  test("requires a display name on signup", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#email").fill(uniqueEmail("blank-name"));
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Tell us your display name." })).toBeVisible();
  });

  test("rejects a short password on signup", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#email").fill(uniqueEmail("short-password"));
    await page.locator("#display-name").fill("Alice");
    await page.locator("#password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "at least 6 characters" })).toBeVisible();
  });

  test("requires a password on login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(uniqueEmail("blank-password"));
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter your password." })).toBeVisible();
  });

  test("signs up straight onto the dashboard, survives sign-out/login, and rejects a repeat signup", async ({ page }) => {
    const email = uniqueEmail("real-signup");

    await page.goto("/signup");
    await page.locator("#email").fill(email);
    await page.locator("#display-name").fill("Alice Example");
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    // No inbox step: signUp returns a session directly (Supabase "Confirm email" is off).
    await expect(page.getByRole("heading", { name: "Create your first cat" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.locator("#email").fill(email);
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("heading", { name: "Create your first cat" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/signup");
    await page.locator("#email").fill(email);
    await page.locator("#display-name").fill("Alice Example");
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That email is already registered." })).toBeVisible();
  });
});

test.describe("cat management", () => {
  test("a brand-new human sees the empty state and can create their first cat", async ({ context, page }) => {
    await loginAsNewHuman(context, "Fresh Human");
    await gotoDashboard(page);

    await expect(page.getByRole("heading", { name: "Create your first cat" })).toBeVisible();

    const catName = uniqueCatName("Pico");
    await page.getByRole("button", { name: "Create your first cat" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Cat name").fill(catName);
    await dialog.getByRole("button", { name: "Create cat" }).click();
    await dialog.waitFor({ state: "hidden" });

    await expect(catCard(page, catName)).toBeVisible();
    expect(await catBalance(page, catName)).toBe(0);
  });

  test("a second cat also starts empty, with no welcome grant", async ({ context, page }) => {
    // Reused account: only checks each cat's own balance by name, unaffected by its history.
    await loginAsFixedHuman(context, "A");
    await gotoDashboard(page);

    const catA = uniqueCatName("Momo");
    const catB = uniqueCatName("Suki");
    await createCat(page, catA);
    await createCat(page, catB);

    await expect(catCard(page, catA)).toBeVisible();
    await expect(catCard(page, catB)).toBeVisible();
    expect(await catBalance(page, catA)).toBe(0);
    expect(await catBalance(page, catB)).toBe(0);
  });

  test("one human's cats and balances never appear on another human's dashboard", async ({ browser }) => {
    const contextA = await browser.newContext({ baseURL });
    const pageA = await contextA.newPage();
    // A only needs its own cat checked by name — reused account is fine. B must be genuinely
    // fresh: this test asserts B's *empty state*, which a reused account would never show again.
    await loginAsFixedHuman(contextA, "A");
    await gotoDashboard(pageA);
    const catA = uniqueCatName("Only-A-Sees-This");
    await createCat(pageA, catA);
    await expect(catCard(pageA, catA)).toBeVisible();

    const contextB = await browser.newContext({ baseURL });
    const pageB = await contextB.newPage();
    await loginAsNewHuman(contextB, "Human B");
    await gotoDashboard(pageB);

    // Human B is brand-new: their own wallet grid is the empty state, not human A's cat.
    await expect(pageB.getByRole("heading", { name: "Create your first cat" })).toBeVisible();
    await expect(catCard(pageB, catA)).toHaveCount(0);

    // The global recipient roster (ADR 0012) still needs to list human A's cat by name so a
    // transfer can be addressed to it — that's the deliberate exception, not a leak.
    const catB = uniqueCatName("B-cat");
    await createCat(pageB, catB);
    await expect(pageB.locator("#receiver-wallet option", { hasText: catA })).toHaveCount(1);

    await contextA.close();
    await contextB.close();
  });
});
