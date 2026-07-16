import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { backendRequestAs } from "../fixtures/api";
import { baseURL } from "../fixtures/config";
import {
  catBalance, confirmSend, confirmTransferDialog, createCat,
  fillManualTransferForm, gotoDashboard, ledgerTrailDesktop, toast, totalHeroAmount,
} from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M5 — Manual transfer (docs/milestones/M05-manual-transfer.md)
// Exercises ADR 0008 (atomic transfer), 0009 (idempotency), 0012 (RLS ownership)
// Verify: send between your own two cats — total hero stays constant, both cards move, the
// trail shows both legs.

test("sending between your own two cats nets the total hero to zero and shows both legs", async ({ context, page }) => {
  await loginAsNewHuman(context, "Own Transfer Human");
  await gotoDashboard(page);
  const sender = uniqueCatName("Sender");
  const receiver = uniqueCatName("Receiver");
  await createCat(page, sender);
  await createCat(page, receiver);

  const totalBefore = await totalHeroAmount(page);
  expect(totalBefore).toBe(1000);

  await fillManualTransferForm(page, { senderCatName: sender, receiverCatName: receiver, amount: 120, note: "for the red dot" });
  await expect(confirmTransferDialog(page)).toBeVisible();
  await expect(confirmTransferDialog(page)).toContainText(sender);
  await expect(confirmTransferDialog(page)).toContainText(receiver);
  await confirmSend(page);
  await expect(toast(page, "Treats sent.")).toBeVisible();

  expect(await catBalance(page, sender)).toBe(380);
  expect(await catBalance(page, receiver)).toBe(620);
  expect(await totalHeroAmount(page)).toBe(totalBefore); // own-cat transfer nets to zero (ADR 0015)

  const table = ledgerTrailDesktop(page);
  await expect(table.locator("tbody tr").filter({ hasText: sender }).filter({ hasText: "Sent" })).toBeVisible();
  await expect(table.locator("tbody tr").filter({ hasText: receiver }).filter({ hasText: "Received" })).toBeVisible();
});

test("sending to another human's cat moves treats out of the sender's total and into the recipient's, live", async ({ browser }) => {
  const contextA = await browser.newContext({ baseURL });
  const pageA = await contextA.newPage();
  await loginAsNewHuman(contextA, "Cross Human Sender");
  await gotoDashboard(pageA);
  const senderCat = uniqueCatName("Cross-Sender");
  await createCat(pageA, senderCat);

  const contextB = await browser.newContext({ baseURL });
  const pageB = await contextB.newPage();
  await loginAsNewHuman(contextB, "Cross Human Receiver");
  await gotoDashboard(pageB);
  const receiverCat = uniqueCatName("Cross-Receiver");
  await createCat(pageB, receiverCat);

  const totalABefore = await totalHeroAmount(pageA);
  await fillManualTransferForm(pageA, { senderCatName: senderCat, receiverCatName: receiverCat, amount: 75 });
  await confirmSend(pageA);
  await expect(toast(pageA, "Treats sent.")).toBeVisible();

  expect(await totalHeroAmount(pageA)).toBe(totalABefore - 75);
  await expect.poll(() => catBalance(pageB, receiverCat), { timeout: 10_000 }).toBe(575); // 500 welcome grant + 75, arrives via realtime, no reload

  await contextA.close();
  await contextB.close();
});

test("insufficient balance fails the transfer and surfaces the backend's failure_reason verbatim", async ({ context, page }) => {
  await loginAsNewHuman(context, "Insufficient Funds Human");
  await gotoDashboard(page);
  const sender = uniqueCatName("Poor");
  const receiver = uniqueCatName("Rich-Target");
  await createCat(page, sender);
  await createCat(page, receiver);

  await fillManualTransferForm(page, { senderCatName: sender, receiverCatName: receiver, amount: 5000 }); // only 500 available
  await confirmSend(page);

  await expect(toast(page, "insufficient_funds")).toBeVisible();
  expect(await catBalance(page, sender)).toBe(500);
  expect(await catBalance(page, receiver)).toBe(500);
});

test("the receiver field never offers the currently-selected sender cat", async ({ context, page }) => {
  await loginAsNewHuman(context, "Self Transfer Human");
  await gotoDashboard(page);
  const catA = uniqueCatName("Self-A");
  const catB = uniqueCatName("Self-B");
  await createCat(page, catA);
  await createCat(page, catB);

  await page.locator("#sender-cat").selectOption({ label: catA });
  await expect(page.locator("#receiver-cat option", { hasText: catA })).toHaveCount(0);
  await expect(page.locator("#receiver-cat option", { hasText: catB })).toHaveCount(1);
});

test("form validation rejects a non-positive amount", async ({ context, page }) => {
  await loginAsNewHuman(context, "Validation Human");
  await gotoDashboard(page);
  const catA = uniqueCatName("Val-A");
  const catB = uniqueCatName("Val-B");
  await createCat(page, catA);
  await createCat(page, catB);

  const section = page.getByRole("region", { name: "Send treats cat to cat" });
  await section.locator("#sender-cat").selectOption({ label: catA });
  await section.locator("#receiver-cat").selectOption({ label: catB });
  await section.locator("#transfer-amount").fill("0");
  await section.getByRole("button", { name: "Review transfer" }).click();
  await expect(section.getByRole("alert")).toHaveText("Amount must be at least 1.");
});

test("a retried submission with the same idempotency key never double-charges", async ({ context }) => {
  const human = await loginAsNewHuman(context, "Idempotency Human");
  const page = await context.newPage();
  await gotoDashboard(page);
  const sender = uniqueCatName("Idem-Sender");
  const receiver = uniqueCatName("Idem-Receiver");
  await createCat(page, sender);
  await createCat(page, receiver);

  const senderId = await page.locator("#sender-cat option", { hasText: sender }).getAttribute("value");
  const receiverId = await page.locator("#receiver-cat option", { hasText: receiver }).getAttribute("value");
  expect(senderId).toBeTruthy();
  expect(receiverId).toBeTruthy();

  const idempotencyKey = randomUUID();
  const body = { idempotencyKey, senderCatId: senderId, receiverCatId: receiverId, amount: 40, note: null, source: "manual" as const };

  const api = await backendRequestAs(human);
  // The client-generated key is minted once, at intent — this fires the exact same intent
  // twice concurrently, which is what a slow-network double-click or a browser retry does.
  const [first, second] = await Promise.all([
    api.post("/api/transfers/execute", { data: body }),
    api.post("/api/transfers/execute", { data: body }),
  ]);
  expect([first.status(), second.status()]).toEqual([200, 200]);
  const [firstBody, secondBody] = await Promise.all([first.json(), second.json()]);
  expect(firstBody.id).toBe(secondBody.id); // same row returned, not two transfers

  await expect.poll(() => catBalance(page, sender), { timeout: 10_000 }).toBe(460); // 500 - 40, exactly once
  expect(await catBalance(page, receiver)).toBe(540);
  await api.dispose();
});

test("rejects a senderCatId the caller does not own", async ({ browser }) => {
  const contextOwner = await browser.newContext({ baseURL });
  const ownerPage = await contextOwner.newPage();
  await loginAsNewHuman(contextOwner, "Cat Owner");
  await gotoDashboard(ownerPage);
  const ownedCat = uniqueCatName("Not-Yours");
  await createCat(ownerPage, ownedCat);
  const catId = await ownerPage.locator("#receiver-cat option", { hasText: ownedCat }).getAttribute("value");

  const contextAttacker = await browser.newContext({ baseURL });
  const attackerPage = await contextAttacker.newPage();
  const attacker = await loginAsNewHuman(contextAttacker, "Attacker");
  await gotoDashboard(attackerPage);
  const attackerCat = uniqueCatName("Attacker-Cat");
  await createCat(attackerPage, attackerCat);
  const attackerReceiverId = await attackerPage.locator("#receiver-cat option", { hasText: attackerCat }).getAttribute("value");

  const api = await backendRequestAs(attacker);
  const response = await api.post("/api/transfers/execute", {
    data: {
      idempotencyKey: randomUUID(),
      senderCatId: catId, // not the attacker's cat
      receiverCatId: attackerReceiverId,
      amount: 10,
      note: null,
      source: "manual",
    },
  });
  expect(response.status()).toBe(403);
  const errorBody = await response.json();
  expect(errorBody.code).toBe("sender_not_owned");

  await api.dispose();
  await contextOwner.close();
  await contextAttacker.close();
});
