import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    localStorage.clear();
  });

  it("flips the dark class", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /switch to dark theme/i }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("dark");
    });
  });
});
