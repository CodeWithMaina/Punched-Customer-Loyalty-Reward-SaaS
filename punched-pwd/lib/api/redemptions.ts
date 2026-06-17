import apiClient from "./client";
import type {
  ApiResponse,
  ClaimRewardRequest,
  RedemptionResponse,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Redemptions API Service
//  Wraps reward claim and redemption history endpoints
// ═══════════════════════════════════════════════════════════════

export const redemptionsApi = {
  /**
   * POST /redemptions/claim
   * Claim a reward when a loyalty card has enough stamps.
   */
  claim: (data: ClaimRewardRequest) =>
    apiClient
      .post<ApiResponse<RedemptionResponse>>("/redemptions/claim", data)
      .then((r) => r.data),

  /**
   * GET /redemptions
   * Get the customer's redemption history.
   */
  getMyRedemptions: () =>
    apiClient
      .get<ApiResponse<RedemptionResponse[]>>("/redemptions")
      .then((r) => r.data),
};
