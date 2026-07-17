import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { loginAsNewHuman } from "../fixtures/auth";
import { backendRequestAs } from "../fixtures/api";
import { gotoDashboard, topupPresets, walletHeroAmount } from "../fixtures/dashboard-page";

test("a free-entry top-up mints 700 into the caller wallet live", async ({ context, page }) => {
  await loginAsNewHuman(context, "Topup Human"); await gotoDashboard(page);
  await page.getByLabel("Add treats").fill("700"); await page.getByRole("button", { name: "Add treats" }).click();
  await expect.poll(() => walletHeroAmount(page), { timeout: 10_000 }).toBe(700);
});

test("preset pills are field shortcuts and keep their touch target on mobile", async ({ context, page }) => {
  await loginAsNewHuman(context, "Preset Human"); await gotoDashboard(page); await page.setViewportSize({ width: 375, height: 900 });
  const pills = topupPresets(page).getByRole("button");
  await pills.nth(1).click(); expect(await page.getByLabel("Add treats").inputValue()).toBe("500");
  for (let index = 0; index < await pills.count(); index += 1) expect((await pills.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
});

test("top-up has no target identifier and rejects non-positive or over-cap amounts", async ({ context }) => {
  const human = await loginAsNewHuman(context, "Topup Bounds Human"); const api = await backendRequestAs(human);
  for (const amount of [0, 1001]) {
    const response = await api.post("/api/wallet/topup", { data: { idempotencyKey: randomUUID(), amount, catId: "ignored-by-dto" } });
    expect(response.status()).toBe(400);
  }
  await api.dispose();
});
