import "./globals.css";

describe("design tokens", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("exposes Clay light-mode tokens through shadcn variables", () => {
    const root = getComputedStyle(document.documentElement);

    expect(root.getPropertyValue("--background").trim()).toBe("46 100% 97%");
    expect(root.getPropertyValue("--foreground").trim()).toBe("0 0% 4%");
    expect(root.getPropertyValue("--card").trim()).toBe("46 100% 97%");
    expect(root.getPropertyValue("--primary").trim()).toBe("0 0% 4%");
    expect(root.getPropertyValue("--radius").trim()).toBe("0.75rem");
  });

  it("exposes the dark extension from existing Clay tokens", () => {
    document.documentElement.classList.add("dark");

    const root = getComputedStyle(document.documentElement);

    expect(root.getPropertyValue("--background").trim()).toBe("180 44% 7%");
    expect(root.getPropertyValue("--card").trim()).toBe("180 23% 13%");
    expect(root.getPropertyValue("--foreground").trim()).toBe("0 0% 100%");
    expect(root.getPropertyValue("--muted-foreground").trim()).toBe("0 0% 63%");
    expect(root.getPropertyValue("--primary").trim()).toBe("46 100% 97%");
  });

  it("commits the derived chart palette as CSS tokens", () => {
    const root = getComputedStyle(document.documentElement);

    expect(root.getPropertyValue("--chart-series-1").trim()).toBe("#a87f00");
    expect(root.getPropertyValue("--chart-series-2").trim()).toBe("#009d81");
    expect(root.getPropertyValue("--chart-series-3").trim()).toBe("#d16100");
    expect(root.getPropertyValue("--chart-series-4").trim()).toBe("#009a9a");
    expect(root.getPropertyValue("--chart-series-5").trim()).toBe("#e24a3c");
  });
});
