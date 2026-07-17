import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "./login-form";

const { signInWithPassword, push, refresh, searchParams } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => searchParams,
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    push.mockReset();
    refresh.mockReset();
    searchParams.delete("next");
  });

  it("validates the email before attempting a login", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("requires a password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your password.");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with the email and password, then lands on the dashboard", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.type(screen.getByLabelText(/password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "human@example.test",
      password: "correct-horse",
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("returns the human to the page they were gated out of", async () => {
    const user = userEvent.setup();
    searchParams.set("next", "/dashboard/settings");
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.type(screen.getByLabelText(/password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(push).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("surfaces a rejected credential and stays put", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(push).not.toHaveBeenCalled();
  });
});
