import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TopupPresets } from "./topup-presets";

const toast = { error: vi.fn(), success: vi.fn() };
vi.mock("sonner", () => ({ toast }));

const idempotencyKey = "00000000-0000-4000-8000-000000000013";
const completedTopup = {
  id: "transfer-1",
  idempotencyKey,
  senderCatId: "00000000-0000-4000-8000-000000000001",
  receiverCatId: "00000000-0000-4000-8000-000000000011",
  amount: 100,
  note: null,
  source: "topup" as const,
  initiatedBy: "human-1",
  status: "completed" as const,
  failureReason: null,
  createdAt: "2026-07-16T10:00:00Z",
};

describe("TopupPresets", () => {
  beforeEach(() => {
    toast.error.mockReset();
    toast.success.mockReset();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => idempotencyKey) });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders the three server-approved presets and submits a selected one", async () => {
    const user = userEvent.setup();
    const onTopUp = vi.fn().mockResolvedValue(completedTopup);
    render(<TopupPresets catId="00000000-0000-4000-8000-000000000011" catName="Milo" onTopUp={onTopUp} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["+100", "+500", "+1,000"]);
    await user.click(screen.getByRole("button", { name: "+100" }));

    await waitFor(() => expect(onTopUp).toHaveBeenCalledWith({
      idempotencyKey,
      catId: "00000000-0000-4000-8000-000000000011",
      amount: 100,
    }));
    expect(toast.success).toHaveBeenCalledWith("Milo received 100 treats.");
  });

  it("keeps 44px controls in a wrapping row instead of shrinking them on mobile", () => {
    const onTopUp = vi.fn().mockResolvedValue(completedTopup);
    render(<TopupPresets catId="00000000-0000-4000-8000-000000000011" catName="Milo" onTopUp={onTopUp} />);

    expect(screen.getByRole("button", { name: "+100" }).parentElement).toHaveClass("flex-wrap");
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toHaveClass("button-secondary", "shrink-0");
    });
  });
});
