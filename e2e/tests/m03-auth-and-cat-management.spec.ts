import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { baseURL } from "../fixtures/config";
import { catBalance, catCard, createCat, gotoDashboard } from "../fixtures/dashboard-page";
import { uniqueCatName, uniqueEmail } from "../fixtures/ids";

// M3 — Auth & cat management (docs/milestones/M03-auth-and-cat-management.md)
// ADRs: 0011 (auth boundary), 0012 (RLS ownership subquery)
// Verify: one human creates two cats; both appear on the dashboard with 500 treats each.
// (Unauthenticated redirect-to-/login is covered by m00-foundation.spec.ts.)

test.describe("login form", () => {
  test("rejects an invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#display-name").fill("Alice");
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
  });

  test("requires a display name", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(uniqueEmail("blank-name"));
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Tell us your display name." })).toBeVisible();
  });

  test("a valid submission sends the magic link and shows the check-your-email notice", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(uniqueEmail("real-login"));
    await page.locator("#display-name").fill("Alice Example");
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("status")).toHaveText("Check your email for your secure sign-in link.");
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
    expect(await catBalance(page, catName)).toBe(500);
  });

  test("a second cat also receives its 500-treat welcome grant", async ({ context, page }) => {
    await loginAsNewHuman(context, "Two Cat Human");
    await gotoDashboard(page);

    const catA = uniqueCatName("Momo");
    const catB = uniqueCatName("Suki");
    await createCat(page, catA);
    await createCat(page, catB);

    await expect(catCard(page, catA)).toBeVisible();
    await expect(catCard(page, catB)).toBeVisible();
    expect(await catBalance(page, catA)).toBe(500);
    expect(await catBalance(page, catB)).toBe(500);
  });

  test("one human's cats and balances never appear on another human's dashboard", async ({ browser }) => {
    const contextA = await browser.newContext({ baseURL });
    const pageA = await contextA.newPage();
    await loginAsNewHuman(contextA, "Human A");
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
    await expect(pageB.locator("#receiver-cat option", { hasText: catA })).toHaveCount(1);

    await contextA.close();
    await contextB.close();
  });
});
