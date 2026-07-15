import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "./login-form";

const { signInWithOtp } = vi.hoisted(() => ({ signInWithOtp: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp } }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
  });

  it("validates email and display name before requesting a magic link", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the display name as GoTrue signup metadata", async () => {
    const user = userEvent.setup();
    signInWithOtp.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.type(screen.getByLabelText(/display name/i), "Human");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "human@example.test",
        options: expect.objectContaining({ data: { display_name: "Human" } }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
  });
});
