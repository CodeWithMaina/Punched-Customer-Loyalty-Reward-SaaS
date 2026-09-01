import { test, expect, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** localStorage keys the web app reads for an existing session. */
export const TOKEN_KEY = "punched_access_token";
export const REFRESH_TOKEN_KEY = "punched_refresh_token";

/** Loads the deterministic E2E tenant written by seed/seed.mjs. */
export function loadTenant() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".auth", "tenant.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Logs in through the UI-independent API and returns an Authorization header.
 * Specs attach API tokens where the UI flow would already have a session.
 */
export function authHeader(tenant, who) {
  return { Authorization: `Bearer ${tenant[who].token}` };
}

/**
 * Seeds a valid session into a fresh browser context BEFORE any page script runs.
 *
 * The web app reads the JWT from localStorage (see punched-pwd/lib/api/client.ts),
 * and its client-side role guard decides auth from localStorage (the cookie is only
 * a middleware fast-path). Without this, a fresh Playwright context loads `/dashboard`
 * as anonymous and immediately redirects to `/login`, so the UI assertions never
 * reach the dashboard. The access token passed in is the real JWT returned by the
 * seed login; the refresh value only needs to be non-null for the sign-in check.
 */
export async function seedSession(context: BrowserContext, accessToken: string) {
  await context.addInitScript(
    ([token]) => {
      window.localStorage.setItem("punched_access_token", token);
      window.localStorage.setItem("punched_refresh_token", "e2e-seeded-session");
    },
    [accessToken],
  );
}
