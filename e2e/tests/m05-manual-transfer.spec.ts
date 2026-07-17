import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { backendRequestAs } from "../fixtures/api";
import { baseURL } from "../fixtures/config";
import { catBalance, confirmSend, createCat, fillManualTransferForm, gotoDashboard, toast, walletHeroAmount } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// The treasury's fixed seed UUID — see TransferService.kt and 0001_init_schema.sql.
const TREASURY_WALLET_ID = "00000000-0000-4000-8000-000000000001";

test("funding a cat moves treats from Your wallet and preserves the household total", async ({ context, page }) => {
  await loginAsNewHuman(context, "Fund Cat Human"); await gotoDashboard(page);
  await page.getByLabel("Add treats").fill("700"); await page.getByRole("button", { name: "Add treats" }).click();
  await expect.poll(() => walletHeroAmount(page)).toBe(700);
  const cat = uniqueCatName("Fund-Me"); await createCat(page, cat);
  await fillManualTransferForm(page, { senderName: "Your wallet", receiverCatName: cat, amount: 300 }); await confirmSend(page);
  await expect(toast(page, "Treats sent.")).toBeVisible();
  expect(await walletHeroAmount(page)).toBe(400); expect(await catBalance(page, cat)).toBe(300);
});

test("the composer stops an amount over the selected sender balance before it is sent", async ({ context, page }) => {
  await loginAsNewHuman(context, "Shortfall Human"); await gotoDashboard(page);
  const cat = uniqueCatName("Target"); await createCat(page, cat);
  await fillManualTransferForm(page, { senderName: "Your wallet", receiverCatName: cat, amount: 1 });
  await page.locator("#transfer-amount").fill("5000");
  await expect(page.getByText("You need 5,000 more treats.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review transfer" })).toBeDisabled();
});

test("the API rejects another human wallet and treasury as client supplied senders", async ({ browser }) => {
  // The sender is client-supplied, so it is the highest-risk surface in the app (ADR 0022).
  // Both rejected senders must be wallets the attacker does *not* own: their own wallet is a
  // legal sender (the composer funds cats from it), so naming it here would prove nothing and
  // would fail on insufficient_funds (422) rather than the guard (403).
  const attackerContext = await browser.newContext({ baseURL });
  const attackerPage = await attackerContext.newPage();
  const attacker = await loginAsNewHuman(attackerContext, "Sender Guard Human");
  await gotoDashboard(attackerPage);
  const cat = uniqueCatName("Receiver");
  await createCat(attackerPage, cat);
  const receiverWalletId = await attackerPage.locator("#receiver-wallet option", { hasText: cat }).getAttribute("value");

  const victimContext = await browser.newContext({ baseURL });
  const victim = await loginAsNewHuman(victimContext, "Sender Guard Victim");
  const victimApi = await backendRequestAs(victim);
  const victimWalletId = (await victimApi.get("/api/me").then((response) => response.json())).walletId;

  const api = await backendRequestAs(attacker);
  for (const senderWalletId of [TREASURY_WALLET_ID, victimWalletId]) {
    const response = await api.post("/api/transfers/execute", { data: { idempotencyKey: randomUUID(), senderWalletId, receiverWalletId, amount: 10, note: null, source: "manual" } });
    expect(response.status()).toBe(403);
    expect((await response.json()).code).toBe("sender_not_owned");
  }

  await api.dispose(); await victimApi.dispose();
  await attackerContext.close(); await victimContext.close();
});
