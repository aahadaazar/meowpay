import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { InsightPanel } from "./insight-panel";

describe("InsightPanel", () => {
  it("renders a loading skeleton then the generated summary", async () => {
    let resolveSummary: (value: string) => void = () => undefined;
    const onRequest = vi.fn(() => new Promise<string>((resolve) => { resolveSummary = resolve; }));
    const user = userEvent.setup();
    render(<InsightPanel onRequest={onRequest} />);

    await user.click(screen.getByRole("button", { name: /generate insight/i }));
    expect(screen.getByRole("status", { name: /loading insight/i })).toBeInTheDocument();
    resolveSummary("Milo sent 25 treats recently.");
    expect(await screen.findByText("Milo sent 25 treats recently.")).toBeInTheDocument();
  });
});
