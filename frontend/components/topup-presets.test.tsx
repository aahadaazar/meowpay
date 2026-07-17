import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TopupPresets } from "./topup-presets";

describe("TopupPresets", () => {
  it("fills the adjoining amount field through its callback instead of submitting", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TopupPresets onPick={onPick} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["+100", "+500", "+1,000"]);
    await user.click(screen.getByRole("button", { name: "+500" }));
    expect(onPick).toHaveBeenCalledWith(500);
  });
});
