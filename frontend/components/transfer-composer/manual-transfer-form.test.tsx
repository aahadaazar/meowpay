import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ManualTransferForm } from "./manual-transfer-form";

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));
const humanWallet = { walletId: "00000000-0000-4000-8000-000000000010", name: "Your wallet", balance: 50 };
const milo = { walletId: "00000000-0000-4000-8000-000000000011", name: "Milo", balance: 20 };
const nori = { walletId: "00000000-0000-4000-8000-000000000012", name: "Nori" };

describe("ManualTransferForm", () => {
  beforeEach(() => vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000013") }));
  afterEach(() => vi.unstubAllGlobals());
  it("offers Your wallet as a sender and blocks amounts above its balance", async () => {
    const user = userEvent.setup();
    render(<ManualTransferForm humanWallet={humanWallet} onSubmitTransfer={vi.fn()} ownedCats={[milo]} recipientCats={[milo, nori]} />);
    expect(screen.getByLabelText("From")).toHaveDisplayValue("Your wallet");
    await user.selectOptions(screen.getByLabelText("To"), nori.walletId);
    await user.type(screen.getByLabelText("Treats"), "60");
    expect(screen.getByText("You need 10 more treats.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review transfer/i })).toBeDisabled();
  });
  it("cat-card prefill selects the human wallet and targeted cat", () => {
    render(<ManualTransferForm humanWallet={humanWallet} onSubmitTransfer={vi.fn()} ownedCats={[milo]} prefill={{ recipientWalletId: nori.walletId, version: 1 }} recipientCats={[milo, nori]} />);
    expect(screen.getByLabelText("From")).toHaveValue(humanWallet.walletId);
    expect(screen.getByLabelText("To")).toHaveValue(nori.walletId);
  });
});
