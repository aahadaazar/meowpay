import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { baseURL } from "../fixtures/config";
import { createCat, fillManualTransferForm, confirmSend, fundCatFromWallet, gotoDashboard, isDarkMode, toast, toggleTheme, topUp } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M1 — Design system (docs/milestones/M01-design-system.md)
//   Verify: render the dashboard shell at 375 / 768 / 1440px in both themes and look at it.
// M7 — Activity charts (docs/milestones/M07-activity-charts.md)
//   Verify: "no dedicated verify step beyond the test suite and a visual pass at 375/768/1440px
//   in both themes — the same layout check M1 establishes."
// Both were marked in the milestone docs as un-run because no browser was available in the
// authoring environment (see CHECKLIST.md) — this spec is that outstanding visual pass.
//
// First run needs `npx playwright test --update-snapshots` (no repo-wide golden image scheme
// exists yet) to record baselines; later runs diff against them.

const breakpoints = [
  { name: "mobile-375", width: 375, height: 900 },
  { name: "tablet-768", width: 768, height: 1000 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

test.describe("M1 theme system", () => {
  test("the theme toggle flips the .dark class on <html>", async ({ page }) => {
    await page.goto("/login");
    expect(await isDarkMode(page)).toBe(false);
    await toggleTheme(page);
    expect(await isDarkMode(page)).toBe(true);
    await toggleTheme(page);
    expect(await isDarkMode(page)).toBe(false);
  });

  for (const theme of ["light", "dark"] as const) {
    for (const bp of breakpoints) {
      test(`login page renders correctly — ${theme}, ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/login");
        if (theme === "dark") await toggleTheme(page);
        await expect(page).toHaveScreenshot(`login-${theme}-${bp.name}.png`, { fullPage: true });
      });

      test(`signup page renders correctly — ${theme}, ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/signup");
        if (theme === "dark") await toggleTheme(page);
        await expect(page).toHaveScreenshot(`signup-${theme}-${bp.name}.png`, { fullPage: true });
      });
    }
  }
});

test.describe("M1/M7 dashboard visual pass", () => {
  const storageStatePath = "test-results/.visual-pass-state.json";

  test.beforeAll(async ({ browser }) => {
    // Populate one human with two cats and a transfer between them so the dashboard —
    // cards, charts, trail — renders representative, non-empty content for the visual pass.
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await loginAsNewHuman(context, "Visual Pass Human");
    const catA = uniqueCatName("Milo");
    const catB = uniqueCatName("Nano");
    await gotoDashboard(page);
    await createCat(page, catA);
    await createCat(page, catB);
    await topUp(page, 100);
    await fundCatFromWallet(page, catA, 50);
    await fillManualTransferForm(page, { senderName: catA, receiverCatName: catB, amount: 50, note: "visual pass fixture" });
    await confirmSend(page);
    await expect(toast(page, "Treats sent.")).toBeVisible();
    await context.storageState({ path: storageStatePath });
    await context.close();
  });

  for (const theme of ["light", "dark"] as const) {
    for (const bp of breakpoints) {
      test(`dashboard renders correctly — ${theme}, ${bp.name}`, async ({ browser }) => {
        const context = await browser.newContext({ baseURL, storageState: storageStatePath });
        const page = await context.newPage();
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await gotoDashboard(page);
        if (theme === "dark") await toggleTheme(page);
        await expect(page.getByRole("heading", { name: "What entered and left" })).toBeVisible();
        await expect(page).toHaveScreenshot(`dashboard-${theme}-${bp.name}.png`, { fullPage: true });
        await context.close();
      });
    }
  }
});
