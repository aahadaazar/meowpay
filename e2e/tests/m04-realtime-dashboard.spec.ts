import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { baseURL } from "../fixtures/config";
import { catCard, createCat, gotoDashboard, ledgerRowByCounterparty, walletHeroAmount } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M12 replacement for the original M4 walkthrough: a signup starts genuinely empty and the
// human wallet, rather than a cat, is the realtime balance surface.
test("a clean signup starts with a zero human wallet and cats begin at zero", async ({ context, page }) => {
  await loginAsNewHuman(context, "Empty Wallet Human");
  await gotoDashboard(page);
  expect(await walletHeroAmount(page)).toBe(0);
  const cat = uniqueCatName("Zero-Cat");
  await createCat(page, cat);
  expect(await catCard(page, cat).getByText(/0 treats/).count()).toBeGreaterThan(0);
  await expect(ledgerRowByCounterparty(page, "MeowPay Treasury")).toHaveCount(0);
});

test("a human-wallet top-up lands in the trail live without refresh", async ({ context, page }) => {
  await loginAsNewHuman(context, "Realtime Wallet Human");
  await gotoDashboard(page);
  await page.getByLabel("Add treats").fill("700");
  await page.getByRole("button", { name: "Add treats" }).click();
  await expect.poll(() => walletHeroAmount(page), { timeout: 10_000 }).toBe(700);
  await expect(ledgerRowByCounterparty(page, "MeowPay Treasury")).toContainText("Top up");
});

test("treasury and another humans wallet remain invisible over RLS and realtime", async ({ browser }) => {
  const contextA = await browser.newContext({ baseURL }); const pageA = await contextA.newPage();
  await loginAsNewHuman(contextA, "RLS A"); await gotoDashboard(pageA);
  const contextB = await browser.newContext({ baseURL }); const pageB = await contextB.newPage();
  await loginAsNewHuman(contextB, "RLS B"); await gotoDashboard(pageB);
  await pageA.getByLabel("Add treats").fill("700"); await pageA.getByRole("button", { name: "Add treats" }).click();
  await expect.poll(() => walletHeroAmount(pageA), { timeout: 10_000 }).toBe(700);
  await pageB.waitForTimeout(3_000);
  expect(await walletHeroAmount(pageB)).toBe(0);
  await expect(ledgerRowByCounterparty(pageB, "MeowPay Treasury")).toHaveCount(0);
  await contextA.close(); await contextB.close();
});
