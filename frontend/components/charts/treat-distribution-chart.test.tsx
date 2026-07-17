import { render, screen } from "@testing-library/react";
import { TreatDistributionChart } from "./treat-distribution-chart";

it("renders the wallet and cat balance split using validated palette slots", () => {
  render(<TreatDistributionChart balance={400} cats={[{ id: "cat-1", walletId: "wallet-1", name: "Milo", balance: 300, createdAt: "2026-07-17T00:00:00Z" }]} />);
  expect(screen.getByText("You")).toBeInTheDocument();
  expect(screen.getByText("Milo")).toBeInTheDocument();
  expect(screen.getByLabelText("Wallet and cat treat distribution").firstElementChild).toHaveStyle({ backgroundColor: "var(--chart-series-1)" });
});
