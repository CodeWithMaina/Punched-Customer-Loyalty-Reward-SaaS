import { defineConfig } from "@playwright/test";

/**
 * Playwright config for the 3 stamping-ecosystem golden paths (Phase 5).
 * Prerequisite: docker compose up (api on :8080, web on :3000) and the
 * deterministic E2E tenant seeded via `npm run seed` (runs automatically
 * through the globalSetup below).
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./seed/seed.mjs",
  use: {
    baseURL: process.env.E2E_WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
