import type { Locator, Page } from "@playwright/test";

/** Thin page-object helpers shared across milestone specs, built from the real markup in
 * frontend/components/{realtime-dashboard,cat-card,new-cat-dialog,wallet-hero,
 * transfer-composer/*,ledger-trail}.tsx — see each component for the source of truth. */

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("heading", { name: "A treat account for every cat" }).waitFor();
}

export function catCard(page: Page, catName: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: catName, exact: true }) });
}

export async function catBalance(page: Page, catName: string): Promise<number> {
  const text = await catCard(page, catName).locator("p", { hasText: "treats" }).innerText();
  const digits = text.replace(/[^0-9]/g, "");
  return Number(digits);
}

export async function walletHeroAmount(page: Page): Promise<number> {
  const text = await page.getByRole("region", { name: "Your wallet" }).getByText(/treats$/).innerText();
  const digits = text.replace(/[^0-9]/g, "");
  return Number(digits);
}

export async function createCat(page: Page, name: string) {
  await page.getByRole("button", { name: "New cat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cat name").fill(name);
  await dialog.getByRole("button", { name: "Create cat" }).click();
  await dialog.waitFor({ state: "hidden" });
}

export function topupPresets(page: Page): Locator {
  return page.getByLabel("Top-up shortcuts");
}

export async function topUp(page: Page, amount: number) {
  await page.getByLabel("Add treats").fill(String(amount));
  await page.getByRole("button", { name: "Add treats" }).click();
}

export type TransferFormInput = {
  senderName: string;
  receiverCatName: string;
  amount: number;
  note?: string;
};

export async function fillManualTransferForm(page: Page, input: TransferFormInput) {
  const section = page.getByRole("region", { name: "Fund a cat or send cat to cat" });
  await section.locator("#sender-wallet").selectOption({ label: input.senderName });
  await section.locator("#receiver-wallet").selectOption({ label: input.receiverCatName });
  await section.locator("#transfer-amount").fill(String(input.amount));
  if (input.note) await section.locator("#transfer-note").fill(input.note);
  await section.getByRole("button", { name: "Review transfer" }).click();
}

export function confirmTransferDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /Send [\d,]+ treats\?/ });
}

export async function confirmSend(page: Page) {
  await confirmTransferDialog(page).getByRole("button", { name: "Confirm send" }).click();
}

export function toast(page: Page, textFragment: string): Locator {
  return page.locator("[data-sonner-toast]").filter({ hasText: textFragment });
}

export function ledgerTrailDesktop(page: Page): Locator {
  return page.getByTestId("ledger-trail-table");
}

export function ledgerTrailMobile(page: Page): Locator {
  return page.getByTestId("ledger-trail-cards");
}

export function ledgerRowByCounterparty(page: Page, counterpartyName: string): Locator {
  return ledgerTrailDesktop(page).locator("tbody tr").filter({ hasText: counterpartyName });
}

export async function toggleTheme(page: Page) {
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
}

export async function isDarkMode(page: Page): Promise<boolean> {
  const className = await page.locator("html").getAttribute("class");
  return (className ?? "").split(/\s+/).includes("dark");
}
