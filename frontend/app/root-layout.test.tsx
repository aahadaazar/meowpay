import { render, screen } from "@testing-library/react";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders its children", () => {
    render(
      <RootLayout>
        <main data-testid="shell">MeowPay shell</main>
      </RootLayout>,
    );

    expect(screen.getByTestId("shell")).toHaveTextContent("MeowPay shell");
  });
});
