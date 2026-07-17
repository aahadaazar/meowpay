import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CatManagementDashboard } from "./cat-management-dashboard";

vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => <span>Theme toggle</span> }));

describe("CatManagementDashboard", () => {
  it("offers cat creation from the empty state", async () => {
    const user = userEvent.setup();
    render(
      <CatManagementDashboard
        me={{ id: "human-1", email: "human@example.test", displayName: "Human", walletId: "wallet-1", balance: 0, cats: [] }}
        onCreateCat={vi.fn().mockResolvedValue({ id: "cat-1", walletId: "wallet-cat-1", name: "Milo", balance: 0, createdAt: "2026-07-15T00:00:00Z" })}
      />,
    );

    expect(screen.getByRole("heading", { name: /create your first cat/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create your first cat/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
