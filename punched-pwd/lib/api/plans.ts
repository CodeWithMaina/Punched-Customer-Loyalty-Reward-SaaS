import apiClient from "./client";
import type { ApiResponse, PlanSummary, UpgradePlanResponse } from "@/types";

/** Cheapest active plan that bundles the given module, formatted from the API price. */
export function addonPriceFor(plans: PlanSummary[], moduleKey: string): string | null {
  const candidates = plans
    .filter((p) => p.modules.includes(moduleKey))
    .sort((a, b) => a.price - b.price);
  if (candidates.length === 0) return null;
  const price = candidates[0].price;
  const interval = candidates[0].billingInterval === "yearly" ? "yr" : "mo";
  return `KES ${price.toLocaleString()}/${interval}`;
}

// ═══════════════════════════════════════════════════════════════
//  Plans + subscription billing API (Step 7.5 / G11)
//  - GET  /v1/plans — active plans + bundled module keys
//  - POST /v1/businesses/me/subscription/upgrade — owner upgrade
// ═══════════════════════════════════════════════════════════════

export const plansApi = {
  /** GET /v1/plans — all active subscription plans. */
  getPlans: () =>
    apiClient
      .get<ApiResponse<PlanSummary[]>>("/plans")
      .then((r) => r.data),

  /** POST /v1/businesses/me/subscription/upgrade — move to a new plan. */
  upgrade: (planKey: string) =>
    apiClient
      .post<ApiResponse<UpgradePlanResponse>>(
        "/businesses/me/subscription/upgrade",
        { planKey }
      )
      .then((r) => r.data),
};
