import { NextRequest } from "next/server";
import { vi } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("redirects an unauthenticated dashboard request to login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fdashboard");
  });
});
