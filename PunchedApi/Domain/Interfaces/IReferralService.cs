using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

public interface IReferralService
{
    // ── Referral Program (Business) ─────────────────────────
    Task<ApiResponse<ReferralProgramResponse>> UpsertProgramAsync(Guid ownerId, UpsertReferralProgramRequest request);
    Task<ApiResponse<ReferralProgramResponse>> GetProgramAsync(Guid businessId);

    // ── Referral Links (Customer) ───────────────────────────
    Task<ApiResponse<ReferralLinkResponse>> GenerateLinkAsync(Guid customerId, GenerateReferralLinkRequest request);
    Task<ApiResponse<List<ReferralLinkResponse>>> GetMyLinksAsync(Guid customerId);
    Task<ApiResponse<ReferralLinkResponse>> GetLinkForBusinessAsync(Guid customerId, Guid businessId);

    // ── Referral Resolution (Referee) ───────────────────────
    Task<ApiResponse<ResolveReferralResponse>> ResolveCodeAsync(Guid refereeId, ResolveReferralRequest request);

    // ── Referral Tracking ───────────────────────────────────
    Task<ApiResponse<List<ReferralResponse>>> GetMyReferralsAsync(Guid customerId);
    Task<ApiResponse<List<ReferralResponse>>> GetIncomingReferralsAsync(Guid customerId);
    Task<ApiResponse<ReferralStatsResponse>> GetMyStatsAsync(Guid customerId);

    // ── Internal: called by StampService on first stamp ─────
    Task ProcessFirstStampReferralAsync(Guid refereeId, Guid businessId);
}
