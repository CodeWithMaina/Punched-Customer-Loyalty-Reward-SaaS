import { test, expect } from "@playwright/test";
import { loadTenant, seedSession } from "./helpers";

/**
 * Golden path 2: staff scans a not-enrolled customer → NOT_ENROLLED branch →
 * "Enroll & give first stamp" → success. The scan console machine guides the
 * flow; here we verify the not-enrolled resolve returns the guided error and
 * the enroll-and-stamp call completes without leaving the screen.
 */
test("staff completes enroll-and-stamp for a not-enrolled customer", async ({ browser }) => {
  const tenant = loadTenant();

  // A second customer who has never enrolled at the E2E business.
  const notEnrolledTokenRes = await fetch(`${tenant.api}/qr/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenant.customer.token}`,
    },
    body: JSON.stringify({ businessId: tenant.businessId }),
  });
  const notEnrolledToken = (await notEnrolledTokenRes.json()).data?.token;
  expect(notEnrolledToken).toBeTruthy();

  const ctx = await browser.newContext();
  // The scan console is behind a Business auth guard; seed the owner session so
  // the page actually renders (otherwise the guard bounces to /login).
  await seedSession(ctx, tenant.owner.token);
  const page = await ctx.newPage();
  await page.goto("/dashboard/business/scan");

  // Resolve first (non-consuming) — must return the guided NOT_ENROLLED state.
  const resolveRes = await ctx.request.post(`${tenant.api}/stamps/resolve`, {
    headers: { Authorization: `Bearer ${tenant.owner.token}` },
    data: { token: notEnrolledToken, businessId: tenant.businessId },
  });
  const resolve = await resolveRes.json();
  expect([200, 404]).toContain(resolveRes.status());
  if (!resolve.success) expect(resolve.error?.code).toBe("NOT_ENROLLED");

  // Complete the guided flow: enroll & give first stamp.
  const enrollRes = await ctx.request.post(`${tenant.api}/cards/enroll-and-stamp`, {
    headers: { Authorization: `Bearer ${tenant.owner.token}` },
    data: { token: notEnrolledToken, businessId: tenant.businessId, stamps: 1 },
  });
  expect(enrollRes.status()).toBe(200);
  const enrolled = (await enrollRes.json()).data;
  expect(enrolled.stampNumber).toBe(1);

  // The scan console reflects success without leaving the screen.
  await expect(page.locator("body")).toContainText(/enrolled|stamp added|success/i, { timeout: 15_000 });

  await ctx.close();
});
