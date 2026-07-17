import { test, expect } from "@playwright/test";
import { loginAsFixedHuman, loginAsNewHuman } from "../fixtures/auth";
import { confirmSend, createCat, fillManualTransferForm, gotoDashboard, toast, topUp } from "../fixtures/dashboard-page";
import { uniqueCatName } from "../fixtures/ids";

// M7 — Activity charts (docs/milestones/M07-activity-charts.md)
// ADR: 0015 (client-side chart derivation, from the same ledger window the trail holds)
// derive.ts's bucketing/fold/netting rules already have unit coverage (derive.test.ts) — this
// spec covers the charts actually rendering and updating live from real activity, plus the
// visual/responsive verify step the milestone doc calls out (375/768/1440, see
// m01-m07-visual.spec.ts for the screenshot pass).

test("top recipients stays empty until the first sent treat, even though the flow chart already has the welcome grant", async ({ context, page }) => {
  await loginAsNewHuman(context, "Chart Empty Human");
  await gotoDashboard(page);
  await createCat(page, uniqueCatName("Chart-Cat"));

  await expect(page.getByRole("heading", { name: "What entered and left" })).toBeVisible();
  await expect(page.getByLabel("Treats sent by recipient")).toHaveCount(0);
  await expect(page.getByText("Recipients will appear after your first sent treat.")).toBeVisible();
});

test("sending treats populates the top recipients chart, and hovering shows its tooltip", async ({ context, page }) => {
  // Reused account: the recipient button is matched by this test's own unique cat name + amount.
  await loginAsFixedHuman(context, "A");
  await gotoDashboard(page);
  const sender = uniqueCatName("Chart-Sender");
  const receiver = uniqueCatName("Chart-Receiver");
  await createCat(page, sender);
  await createCat(page, receiver);
  await fillManualTransferForm(page, { senderName: sender, receiverCatName: receiver, amount: 60 });
  await confirmSend(page);
  await expect(toast(page, "Treats sent.")).toBeVisible();

  const recipientButton = page.getByRole("button", { name: `${receiver}, 60 treats sent` });
  await expect(recipientButton).toBeVisible();

  await recipientButton.hover();
  await expect(page.locator("#top-recipients-tooltip")).toHaveText(`${receiver} received 60 treats.`);
});

test("an internal own-cat transfer nets to zero in the flow chart, but its recipient still appears in top recipients", async ({ context, page }) => {
  // Both legs of an own-cat transfer are visible to the same human, so derive.ts's flow bucket
  // nets them to zero (ADR 0015) — but the recipients tally only looks at debit legs, with no
  // "was this internal" exclusion, so the receiving cat still shows up there.
  await loginAsNewHuman(context, "Internal Transfer Human");
  await gotoDashboard(page);
  const catA = uniqueCatName("Internal-A");
  const catB = uniqueCatName("Internal-B");
  await createCat(page, catA);
  await createCat(page, catB);
  await fillManualTransferForm(page, { senderName: catA, receiverCatName: catB, amount: 90 });
  await confirmSend(page);
  await expect(toast(page, "Treats sent.")).toBeVisible();

  await expect(page.getByRole("button", { name: `${catB}, 90 treats sent` })).toBeVisible();

  // Both legs of the internal transfer are skipped entirely by derive.ts's flow bucketing, so
  // today's bar shows only the two welcome grants: 500 + 500 = 1000 credits, 0 debits.
  const tooltip = page.locator("#treat-flow-tooltip");
  const bar = page.locator('rect[role="button"][aria-label*="1000 credits and 0 debits"]');
  await bar.hover();
  await expect(tooltip).toContainText("1,000 credits");
  await expect(tooltip).toContainText("0 debits");
});

test("both charts render and reflow from a 2-up grid to a single column below 768px", async ({ context, page }) => {
  await loginAsFixedHuman(context, "B");
  await gotoDashboard(page);
  const sender = uniqueCatName("Layout-Sender");
  const receiver = uniqueCatName("Layout-Receiver");
  await createCat(page, sender);
  await createCat(page, receiver);
  await topUp(page, 500);
  await fillManualTransferForm(page, { senderName: sender, receiverCatName: receiver, amount: 30 });
  await confirmSend(page);
  await expect(toast(page, "Treats sent.")).toBeVisible();

  const flow = page.getByRole("heading", { name: "What entered and left" });
  const recipients = page.getByRole("heading", { name: "Where treats went" });

  await page.setViewportSize({ width: 1024, height: 900 });
  const flowBoxDesktop = await flow.boundingBox();
  const recipientsBoxDesktop = await recipients.boundingBox();
  expect(flowBoxDesktop && recipientsBoxDesktop && Math.abs(flowBoxDesktop.y - recipientsBoxDesktop.y)).toBeLessThan(10); // side by side

  await page.setViewportSize({ width: 480, height: 1400 });
  const flowBoxMobile = await flow.boundingBox();
  const recipientsBoxMobile = await recipients.boundingBox();
  expect(flowBoxMobile && recipientsBoxMobile && recipientsBoxMobile.y - flowBoxMobile.y).toBeGreaterThan(50); // stacked
});
