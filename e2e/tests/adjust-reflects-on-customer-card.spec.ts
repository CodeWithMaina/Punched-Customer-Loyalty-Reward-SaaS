import { test, expect } from "@playwright/test";
import { loadTenant, seedSession } from "./helpers";

/**
 * Golden path 3: business adjusts a stamp on a customer → the customer's card
 * page reflects the new total (asserted via UI reload after the SSE-driven
 * update, so the test is transport-agnostic and never sleeps).
 */
test("business stamp adjustment reflects on customer card", async ({ browser }) => {
  const tenant = loadTenant();

  // Give the customer one stamp so there is progress to adjust.
  const awardRes = await fetch(`${tenant.api}/qr/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenant.customer.token}`,
    },
    body: JSON.stringify({ businessId: tenant.businessId }),
  });
  const qrToken = (await awardRes.json()).data?.token;
  await fetch(`${tenant.api}/stamps/award`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenant.owner.token}`,
    },
    body: JSON.stringify({ token: qrToken, businessId: tenant.businessId }),
  });

  // Resolve the card id via the owner's customer list.
  const cardsRes = await fetch(`${tenant.api}/businesses/me/customers`, {
    headers: { Authorization: `Bearer ${tenant.owner.token}` },
  });
  const cardsJson = await cardsRes.json().catch(() => ({}));
  const card = cardsJson?.data?.items?.[0] ?? cardsJson?.data?.[0];
  expect(card).toBeTruthy();

  // Business adjusts +1 (ManualCorrection).
  const adjustRes = await fetch(`${tenant.api}/stamps/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenant.owner.token}`,
    },
    body: JSON.stringify({
      cardId: card.id ?? card.cardId,
      delta: 1,
      reason: "ManualCorrection",
      note: "e2e golden path 3",
    }),
  });
  expect(adjustRes.status).toBe(200);
  const adjusted = (await adjustRes.json()).data;
  const expectedTotal = adjusted.totalStampsAfter;

  // Customer card page reflects the new total after reload (no sleeps —
  // single reload, then explicit condition polling via expect).
  const ctx = await browser.newContext();
  // The customer dashboard is behind an auth guard; seed the tenant's customer
  // session so the card page actually renders instead of bouncing to /login.
  await seedSession(ctx, tenant.customer.token);
  const page = await ctx.newPage();
  await page.goto("/dashboard");
  await page.reload();
  await expect(page.getByText(new RegExp(`${expectedTotal}\\s*/\\s*5`)).first()).toBeVisible({
    timeout: 15_000,
  });

  await ctx.close();
});
