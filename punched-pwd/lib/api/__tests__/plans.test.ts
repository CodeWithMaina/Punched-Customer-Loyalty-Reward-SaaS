import { addonPriceFor } from "@/lib/api/plans";
import type { PlanSummary } from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Step 7.5/7.6 — plan-driven pricing. Pricing on the modules page
//  must come from GET /v1/plans, never from hardcoded client maps.
// ═══════════════════════════════════════════════════════════════

const PLANS: PlanSummary[] = [
  {
    key: "starter",
    name: "Starter",
    price: 0,
    billingInterval: "monthly",
    modules: ["customers", "staff", "settings"],
  },
  {
    key: "growth",
    name: "Growth",
    price: 29.99,
    billingInterval: "monthly",
    modules: ["customers", "staff", "settings", "appointments", "stamps", "notifications", "serviceCatalog"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 79.99,
    billingInterval: "monthly",
    modules: ["customers", "staff", "settings", "appointments", "stamps", "notifications", "loyalty", "analytics", "referral", "serviceCatalog"],
  },
];

describe("addonPriceFor (plan-driven pricing)", () => {
  it("returns the cheapest plan price that includes the module", () => {
    // "appointments" is bundled by growth (29.99) and pro (79.99).
    expect(addonPriceFor(PLANS, "appointments")).toBe("KES 29.99/mo");
  });

  it("formats yearly plans with a /yr suffix", () => {
    const yearly: PlanSummary[] = [
      { key: "pro", name: "Pro", price: 799, billingInterval: "yearly", modules: ["loyalty"] },
    ];
    expect(addonPriceFor(yearly, "loyalty")).toBe("KES 799/yr");
  });

  it("returns null when no plan bundles the module", () => {
    expect(addonPriceFor(PLANS, "rewards")).toBeNull();
  });

  it("never contains hardcoded legacy prices", () => {
    // Legacy hardcoded map was $9/mo analytics, $6/mo loyalty/referral.
    for (const key of ["analytics", "loyalty", "referral", "appointments", "stamps"]) {
      const price = addonPriceFor(PLANS, key);
      if (price !== null) expect(price).not.toMatch(/^\$\d/m);
    }
  });
});
