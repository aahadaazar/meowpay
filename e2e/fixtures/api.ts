import { request as playwrightRequest } from "@playwright/test";
import type { TestHuman } from "./auth";
import { backendURL } from "./config";

/**
 * A handful of edge cases (ownership rejection, the top-up allowlist/cap) are security
 * boundaries the UI never exercises directly — there is no "arbitrary amount" field or
 * "someone else's cat" option to click. These hit the real, running backend directly with a
 * real bearer token from a real test human, which is still end-to-end against the live
 * deployed stack — just not through a browser widget.
 */
export async function backendRequestAs(human: TestHuman) {
  const context = await playwrightRequest.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${human.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return context;
}
