import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCatDialog } from "./new-cat-dialog";

describe("NewCatDialog", () => {
  it("promises no welcome grant: cats are created empty and funded from the wallet", () => {
    render(<NewCatDialog isOpen onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.queryByText(/welcome treats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();
    expect(screen.getByText(/start at zero/i)).toBeInTheDocument();
  });

  it("names the new cat and trims it before creating", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<NewCatDialog isOpen onClose={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Cat name"), "  Milo  ");
    await user.click(screen.getByRole("button", { name: "Create cat" }));

    expect(onCreate).toHaveBeenCalledWith("Milo");
  });

  it("refuses a blank name without calling the server", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewCatDialog isOpen onClose={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: "Create cat" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Give your cat a name.");
    expect(onCreate).not.toHaveBeenCalled();
  });
});
