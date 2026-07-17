import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { WalletHero } from "./wallet-hero";

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));

it("uses a preset to fill the field and submits an arbitrary bounded amount", async () => {
  const user = userEvent.setup();
  const onTopUp = vi.fn().mockResolvedValue({ status: "completed" });
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000013") });
  render(<WalletHero balance={0} entries={[]} onTopUp={onTopUp} walletId="wallet" />);
  await user.click(screen.getByRole("button", { name: "+500" }));
  expect(screen.getByLabelText("Add treats")).toHaveValue(500);
  await user.clear(screen.getByLabelText("Add treats"));
  await user.type(screen.getByLabelText("Add treats"), "700");
  await user.click(screen.getByRole("button", { name: "Add treats" }));
  expect(onTopUp).toHaveBeenCalledWith(expect.objectContaining({ amount: 700 }));
  vi.unstubAllGlobals();
});
