import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "__inter",
    style: { fontFamily: "Inter" },
    variable: "__inter-variable",
  }),
}));
