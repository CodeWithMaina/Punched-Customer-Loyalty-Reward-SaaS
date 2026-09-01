import apiClient from "./client";
import type {
  ApiResponse,
  ClaimRewardRequest,
  RedemptionResponse,
  FulfillRedemptionRequest,
  FulfillRedemptionResponse,
  CancelRedemptionRequest,
  CancelRedemptionResponse,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Redemptions API Service
//  Wraps reward claim, redemption history, fulfilment and cancel
// ═══════════════════════════════════════════════════════════════

export const redemptionsApi = {
  /**
   * POST /redemptions/claim
   * Claim a reward when a loyalty card has enough stamps.
   * Returns the one-time 6-char fulfilment code (shown once).
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

  /**
   * GET /redemptions/pending
   * Business + Staff: pending redemptions for the scoped business (fulfilment queue).
   */
  getPending: () =>
    apiClient
      .get<ApiResponse<RedemptionResponse[]>>("/redemptions/pending")
      .then((r) => r.data),

  /**
   * POST /redemptions/fulfill
   * Business + Staff verify the 6-char code and mark the reward fulfilled.
   */
  fulfill: (data: FulfillRedemptionRequest) =>
    apiClient
      .post<ApiResponse<FulfillRedemptionResponse>>("/redemptions/fulfill", data)
      .then((r) => r.data),

  /**
   * POST /redemptions/{id}/cancel
   * Business-only cancel — restores the stamps consumed at claim.
   */
  cancel: (redemptionId: string, data: CancelRedemptionRequest) =>
    apiClient
      .post<ApiResponse<CancelRedemptionResponse>>(`/redemptions/${redemptionId}/cancel`, data)
      .then((r) => r.data),
};
