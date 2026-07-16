import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { baseURL } from "../fixtures/config";
import { catCard, createCat, gotoDashboard, ledgerRowByCounterparty, ledgerTrailDesktop, ledgerTrailMobile, totalHeroAmount } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M4 — Realtime dashboard (docs/milestones/M04-realtime-dashboard.md)
// ADR: 0013 (realtime scopes via RLS; subscribe to ledger_entries, never transfers)
// Verify: "create a cat, watch its grant land live in the trail" — the first real end-to-end
// moment, welcome grants from M3 already visible with no further backend work.

test("the total hero sums every cat's balance", async ({ context, page }) => {
  await loginAsNewHuman(context, "Totals Human");
  await gotoDashboard(page);
  const catA = uniqueCatName("Add-A");
  const catB = uniqueCatName("Add-B");
  await createCat(page, catA);
  await createCat(page, catB);

  await expect(catCard(page, catB)).toBeVisible();
  expect(await totalHeroAmount(page)).toBe(1000); // 500 + 500 welcome grants
});

test("a new cat's welcome grant lands in the ledger trail live, with no page refresh", async ({ context, page }) => {
  await loginAsNewHuman(context, "Realtime Human");
  await gotoDashboard(page);

  const catName = uniqueCatName("Grant-Cat");
  await createCat(page, catName);

  // No page.reload() anywhere in this test — the row must appear from the realtime
  // subscription to ledger_entries (ADR 0013), the same way a second browser tab would see it.
  const grantRow = ledgerRowByCounterparty(page, "MeowPay Treasury");
  await expect(grantRow).toBeVisible({ timeout: 10_000 });
  await expect(grantRow).toContainText("Welcome grant");
  await expect(grantRow).toContainText("+500");
});

test("the ledger trail collapses from a table to stacked cards below 768px", async ({ context, page }) => {
  await loginAsNewHuman(context, "Responsive Human");
  await gotoDashboard(page);
  await createCat(page, uniqueCatName("Responsive-Cat"));

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(ledgerTrailDesktop(page)).toBeVisible();
  await expect(ledgerTrailMobile(page)).not.toBeVisible();

  await page.setViewportSize({ width: 480, height: 900 });
  await expect(ledgerTrailDesktop(page)).not.toBeVisible();
  await expect(ledgerTrailMobile(page)).toBeVisible();
});

test("one human's realtime activity is never delivered to another human's socket", async ({ browser }) => {
  const contextA = await browser.newContext({ baseURL });
  const pageA = await contextA.newPage();
  await loginAsNewHuman(contextA, "Realtime Human A");
  await gotoDashboard(pageA);

  const contextB = await browser.newContext({ baseURL });
  const pageB = await contextB.newPage();
  await loginAsNewHuman(contextB, "Realtime Human B");
  await gotoDashboard(pageB);

  // B has their own activity first, so "B sees nothing new" (trivially true for a silent socket)
  // is distinguished from "B's own row count never changes when A acts".
  const catB = uniqueCatName("B-Own-Grant");
  await createCat(pageB, catB);
  await expect(ledgerRowByCounterparty(pageB, "MeowPay Treasury")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.locator("tbody tr")).toHaveCount(1);

  const catA = uniqueCatName("A-Only-Grant");
  await createCat(pageA, catA);
  await expect(ledgerRowByCounterparty(pageA, "MeowPay Treasury")).toBeVisible({ timeout: 10_000 });

  // Give B's socket the same window to (incorrectly) receive A's row, then assert it didn't:
  // still exactly one row, and it is still B's own cat, never A's.
  await pageB.waitForTimeout(3_000);
  await expect(pageB.locator("tbody tr")).toHaveCount(1);
  await expect(ledgerTrailDesktop(pageB)).toContainText(catB);
  await expect(ledgerTrailDesktop(pageB)).not.toContainText(catA);

  await contextA.close();
  await contextB.close();
});
