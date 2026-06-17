import apiClient from "./client";
import type {
  ApiResponse,
  ReferralProgram,
  UpsertReferralProgramRequest,
  ReferralLink,
  GenerateReferralLinkRequest,
  ResolveReferralRequest,
  ResolveReferralResponse,
  Referral,
  ReferralStats,
} from "@/types";

export const referralsApi = {
  // ── Referral Program (Business) ───────────────────────────

  upsertProgram: (data: UpsertReferralProgramRequest) =>
    apiClient
      .put<ApiResponse<ReferralProgram>>("/referrals/programs/me", data)
      .then((r) => r.data),

  getProgram: (businessId: string) =>
    apiClient
      .get<ApiResponse<ReferralProgram>>(`/referrals/programs/${businessId}`)
      .then((r) => r.data),

  // ── Referral Links (Customer) ─────────────────────────────

  generateLink: (data: GenerateReferralLinkRequest) =>
    apiClient
      .post<ApiResponse<ReferralLink>>("/referrals/links", data)
      .then((r) => r.data),

  getMyLinks: () =>
    apiClient
      .get<ApiResponse<ReferralLink[]>>("/referrals/links")
      .then((r) => r.data),

  getLinkForBusiness: (businessId: string) =>
    apiClient
      .get<ApiResponse<ReferralLink>>(`/referrals/links/${businessId}`)
      .then((r) => r.data),

  // ── Referral Resolution ───────────────────────────────────

  resolveCode: (data: ResolveReferralRequest) =>
    apiClient
      .post<ApiResponse<ResolveReferralResponse>>("/referrals/resolve", data)
      .then((r) => r.data),

  // ── Referral Tracking ─────────────────────────────────────

  getMyReferrals: () =>
    apiClient
      .get<ApiResponse<Referral[]>>("/referrals")
      .then((r) => r.data),

  getIncomingReferrals: () =>
    apiClient
      .get<ApiResponse<Referral[]>>("/referrals/incoming")
      .then((r) => r.data),

  getMyStats: () =>
    apiClient
      .get<ApiResponse<ReferralStats>>("/referrals/stats")
      .then((r) => r.data),
};
