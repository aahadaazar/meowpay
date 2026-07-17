import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { loginAsFixedHuman, loginAsNewHuman } from "../fixtures/auth";
import { backendRequestAs } from "../fixtures/api";
import { baseURL } from "../fixtures/config";
import { catBalance, createCat, gotoDashboard, topUp, topupPresets, totalHeroAmount } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M6 — Top-up (docs/milestones/M06-topup.md)
// ADR: 0014 (top-up is a treasury transfer; amount policy is server-side)
// Verify: top up a wallet from the dashboard; the balance and total update live, with no
// refresh. (Every wallet is created with its 500-treat welcome grant — there is no reachable
// zero-balance state in this UI — so this tops up a freshly-created cat instead of a literally
// empty one, which is the same live-update path the milestone verify step describes.)

test("a preset pill tops up the cat and the total, live, with no page refresh", async ({ context, page }) => {
  await loginAsNewHuman(context, "Topup Human");
  await gotoDashboard(page);
  const cat = uniqueCatName("Topup-Cat");
  await createCat(page, cat);

  const totalBefore = await totalHeroAmount(page);
  await topUp(page, cat, 500);

  await expect.poll(() => catBalance(page, cat), { timeout: 10_000 }).toBe(1000);
  expect(await totalHeroAmount(page)).toBe(totalBefore + 500);
});

test("each preset pill keeps its 44px touch target at a mobile viewport (wraps rather than shrinks)", async ({ context, page }) => {
  await loginAsFixedHuman(context, "A");
  await gotoDashboard(page);
  const cat = uniqueCatName("Mobile-Cat");
  await createCat(page, cat);

  await page.setViewportSize({ width: 375, height: 900 });
  const pills = topupPresets(page, cat).getByRole("button");
  const count = await pills.count();
  for (let i = 0; i < count; i += 1) {
    const box = await pills.nth(i).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("rejects an amount that is not on the preset allowlist", async ({ context }) => {
  const human = await loginAsFixedHuman(context, "B");
  const page = await context.newPage();
  await gotoDashboard(page);
  const cat = uniqueCatName("Allowlist-Cat");
  await createCat(page, cat);
  const catId = await page.locator("#receiver-cat option", { hasText: cat }).getAttribute("value");

  const api = await backendRequestAs(human);
  const response = await api.post("/api/wallet/topup", {
    data: { idempotencyKey: randomUUID(), catId, amount: 250 }, // not in {100, 500, 1000}
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe("topup_amount_not_allowed");
  await api.dispose();
});

test("rejects topping up a cat the caller does not own", async ({ browser }) => {
  const contextOwner = await browser.newContext({ baseURL });
  const ownerPage = await contextOwner.newPage();
  await loginAsFixedHuman(contextOwner, "A");
  await gotoDashboard(ownerPage);
  const ownedCat = uniqueCatName("Owned-Wallet");
  await createCat(ownerPage, ownedCat);
  const catId = await ownerPage.locator("#receiver-cat option", { hasText: ownedCat }).getAttribute("value");

  const contextAttacker = await browser.newContext({ baseURL });
  const attacker = await loginAsFixedHuman(contextAttacker, "B");

  const api = await backendRequestAs(attacker);
  const response = await api.post("/api/wallet/topup", {
    data: { idempotencyKey: randomUUID(), catId, amount: 500 },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe("cat_not_owned");

  await api.dispose();
  await contextOwner.close();
  await contextAttacker.close();
});
