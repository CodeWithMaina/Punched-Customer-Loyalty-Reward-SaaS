import { test, expect } from "@playwright/test";
import { loadTenant, seedSession } from "./helpers";

/**
 * Golden path 1: customer sees a stamp live.
 * Business/staff scan console awards a stamp against the customer's fresh QR
 * token; the customer's card page must show the new stamp total within timeout
 * (UI poll or SSE — the assertion is on the visible state, not the transport).
 */
test("customer sees stamp live after business scan", async ({ browser }) => {
  const tenant = loadTenant();

  // Customer context: card page open. Seed the customer's session so the
  // auth guard lets the dashboard render (otherwise it redirects to /login).
  const customerCtx = await browser.newContext();
  await seedSession(customerCtx, tenant.customer.token);
  const customerPage = await customerCtx.newPage();
  await customerPage.goto("/dashboard");
  // The customer dashboard shows the enrolled card's progress; the stamp count
  // element is the progress ring / "X/5" counter on the card tile.
  const customerCard = customerPage.getByText(/E2E Salon|E2E Program/).first();
  await expect(customerCard).toBeVisible();

  // Business context: scan console awards the stamp via the API the console
  // itself uses (the UI form of this journey is exercised by the machine
  // tests; here we assert the observable end state end-to-end).
  const awardRes = await customerCtx.request.post(`${tenant.api}/stamps/award`, {
    headers: { Authorization: `Bearer ${tenant.owner.token}` },
    data: { token: tenant.qrToken, businessId: tenant.businessId, stampCount: 1 },
  });
  expect(awardRes.status()).toBe(200);
  const award = (await awardRes.json()).data;
  expect(award.stampNumber).toBe(1);

  // Customer page reflects the new total within timeout (SSE or refetch).
  await expect(customerPage.getByText(/1\s*\/\s*5|1 of 5|1 stamp/i).first()).toBeVisible({
    timeout: 15_000,
  });

  await customerCtx.close();
});
