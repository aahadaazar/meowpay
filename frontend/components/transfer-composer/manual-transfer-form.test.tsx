import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ManualTransferForm } from "./manual-transfer-form";

const toast = { error: vi.fn(), success: vi.fn() };
vi.mock("sonner", () => ({ toast }));

const sender = { id: "00000000-0000-4000-8000-000000000011", name: "Milo" };
const recipient = { id: "00000000-0000-4000-8000-000000000012", name: "Nori" };
const idempotencyKey = "00000000-0000-4000-8000-000000000013";

describe("ManualTransferForm", () => {
  beforeEach(() => {
    toast.error.mockReset();
    toast.success.mockReset();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => idempotencyKey) });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("validates a recipient and a positive whole amount before opening confirmation", async () => {
    const user = userEvent.setup();
    render(<ManualTransferForm onSubmitTransfer={vi.fn()} ownedCats={[sender]} recipientCats={[sender, recipient]} />);

    await user.click(screen.getByRole("button", { name: /review transfer/i }));

    expect(screen.getByText(/choose a cat to receive/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a whole number/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits the confirmed intent exactly once even when confirm is clicked twice", async () => {
    const user = userEvent.setup();
    const onSubmitTransfer = vi.fn().mockResolvedValue({
      id: "transfer-1", idempotencyKey, senderCatId: sender.id, receiverCatId: recipient.id,
      amount: 12, note: "Treats", source: "manual", initiatedBy: "human-1", status: "completed",
      failureReason: null, createdAt: "2026-07-16T10:00:00Z",
    });
    render(<ManualTransferForm onSubmitTransfer={onSubmitTransfer} ownedCats={[sender]} recipientCats={[sender, recipient]} />);

    await user.selectOptions(screen.getByLabelText("To"), recipient.id);
    await user.type(screen.getByLabelText("Treats"), "12");
    await user.type(screen.getByLabelText(/note/i), "Treats");
    await user.click(screen.getByRole("button", { name: /review transfer/i }));
    await user.dblClick(screen.getByRole("button", { name: /confirm send/i }));

    expect(onSubmitTransfer).toHaveBeenCalledTimes(1);
    expect(onSubmitTransfer).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey, amount: 12, source: "manual" }));
  });

  it("shows the backend failure_reason verbatim", async () => {
    const user = userEvent.setup();
    const onSubmitTransfer = vi.fn().mockResolvedValue({
      id: "transfer-1", idempotencyKey, senderCatId: sender.id, receiverCatId: recipient.id,
      amount: 600, note: null, source: "manual", initiatedBy: "human-1", status: "failed",
      failureReason: "insufficient_funds", createdAt: "2026-07-16T10:00:00Z",
    });
    render(<ManualTransferForm onSubmitTransfer={onSubmitTransfer} ownedCats={[sender]} recipientCats={[sender, recipient]} />);

    await user.selectOptions(screen.getByLabelText("To"), recipient.id);
    await user.type(screen.getByLabelText("Treats"), "600");
    await user.click(screen.getByRole("button", { name: /review transfer/i }));
    await user.click(screen.getByRole("button", { name: /confirm send/i }));

    expect(toast.error).toHaveBeenCalledWith("insufficient_funds");
  });
});
