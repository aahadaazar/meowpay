import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { backendRequestAs } from "../fixtures/api";
import { catBalance, confirmSend, createCat, fillManualTransferForm, gotoDashboard, toast, walletHeroAmount } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

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

test("the API rejects another human wallet and treasury as client supplied senders", async ({ context, page }) => {
  const attacker = await loginAsNewHuman(context, "Sender Guard Human"); await gotoDashboard(page);
  const cat = uniqueCatName("Receiver"); await createCat(page, cat);
  const receiverWalletId = await page.locator("#receiver-wallet option", { hasText: cat }).getAttribute("value");
  const me = await (await backendRequestAs(attacker)).get("/api/me").then((response) => response.json());
  const api = await backendRequestAs(attacker);
  for (const senderWalletId of ["00000000-0000-4000-8000-000000000001", me.walletId]) {
    const response = await api.post("/api/transfers/execute", { data: { idempotencyKey: randomUUID(), senderWalletId, receiverWalletId, amount: 10, note: null, source: "manual" } });
    expect(response.status()).toBe(403);
  }
  await api.dispose();
});
