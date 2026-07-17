import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SignupForm } from "./signup-form";

const { signUp, push, refresh } = vi.hoisted(() => ({
  signUp: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

async function fillSignupForm(user: ReturnType<typeof userEvent.setup>, password = "treats123") {
  await user.type(screen.getByLabelText(/email address/i), "human@example.test");
  await user.type(screen.getByLabelText(/display name/i), "Human");
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("SignupForm", () => {
  beforeEach(() => {
    signUp.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("validates the email before attempting a signup", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("requires a display name", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/email address/i), "human@example.test");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Tell us your display name.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a password under the minimum length", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillSignupForm(user, "short");

    expect(screen.getByRole("alert")).toHaveTextContent("at least 6 characters");
    expect(signUp).not.toHaveBeenCalled();
  });

  // The humans row is created by a trigger on auth.users that reads display_name out of
  // raw_user_meta_data (0006_new_user_trigger.sql) — this metadata shape is that contract.
  it("sends the display name as GoTrue signup metadata, then lands on the dashboard", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { user: { identities: [{ id: "identity-1" }] } }, error: null });
    render(<SignupForm />);

    await fillSignupForm(user);

    expect(signUp).toHaveBeenCalledWith({
      email: "human@example.test",
      password: "treats123",
      options: { data: { display_name: "Human" } },
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects an email that is already registered", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: { user: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });
    render(<SignupForm />);

    await fillSignupForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("That email is already registered.");
    expect(push).not.toHaveBeenCalled();
  });

  // With email confirmation enabled GoTrue hides a duplicate signup behind a success-shaped
  // response carrying no identities, rather than erroring (anti-enumeration).
  it("rejects a duplicate email disguised as a success with no identities", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    render(<SignupForm />);

    await fillSignupForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("That email is already registered.");
    expect(push).not.toHaveBeenCalled();
  });
});
