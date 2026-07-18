import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { WalletHero } from "./wallet-hero";

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));

it("submits a fixed 1000-treat top-up with a single click", async () => {
  const user = userEvent.setup();
  const onTopUp = vi.fn().mockResolvedValue({ status: "completed" });
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000013") });
  render(<WalletHero balance={0} entries={[]} onTopUp={onTopUp} walletId="wallet" />);
  await user.click(screen.getByRole("button", { name: "Add 1,000 treats" }));
  expect(onTopUp).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 }));
  vi.unstubAllGlobals();
});
