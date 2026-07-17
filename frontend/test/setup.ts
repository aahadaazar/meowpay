import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "__inter",
    style: { fontFamily: "Inter" },
    variable: "__inter-variable",
  }),
}));

if (typeof window !== "undefined") {
  // jsdom implements no layout, so it ships no scrollIntoView; the cat card's "Send treats"
  // prefill calls it on the composer heading.
  Element.prototype.scrollIntoView = vi.fn();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
