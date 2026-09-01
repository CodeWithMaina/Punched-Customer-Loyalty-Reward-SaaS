using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

public interface IStampService
{
    Task<ApiResponse<StampAwardedResponse>> AwardStampAsync(
        Guid staffOrBusinessUserId,
        AwardStampRequest request,
        string? idempotencyKey = null);

    /// <summary>Validates a QR token for preview. Never mutates state; never consumes the token.</summary>
    Task<ApiResponse<ResolveQrResponse>> ResolveTokenAsync(Guid staffOrBusinessUserId, AwardStampRequest request);

    /// <summary>Business-only stamp adjustment (delta can be negative). RESTRICT under a card row lock.</summary>
    Task<ApiResponse<StampAdjustmentResponse>> AdjustStampsAsync(Guid actorUserId, StampAdjustmentRequest request);

    /// <summary>Business + Staff phone lookup issuing a one-time manual token (5/hr/user rate-limited).</summary>
    Task<ApiResponse<ManualLookupResponse>> ManualLookupAsync(Guid staffOrBusinessUserId, ManualLookupRequest request);

    /// <summary>
    /// Enroll the customer (if not already enrolled) and award stamps using the
    /// same locked transaction as AwardStampAsync. Idempotent enrollment.
    /// </summary>
    Task<ApiResponse<StampAwardedResponse>> EnrollAndStampAsync(
        Guid staffOrBusinessUserId,
        EnrollAndStampRequest request,
        string? idempotencyKey = null);

    Task<ApiResponse<Stamp>> CreateEnrollmentStampAsync(Guid cardId, int stampNumber);
    Task<ApiResponse<Stamp>> CreateScanStampAsync(Guid cardId, int stampNumber, Guid staffUserId);
    Task<ApiResponse<List<StampDto>>> GetRecentStampsAsync(Guid businessId, Guid? staffUserId, int limit = 20);

    /// <summary>Paged, filterable stamp activity feed for an owner or staff member (scoped to their business).</summary>
    Task<ApiResponse<StampActivityPage>> GetActivityAsync(Guid actorUserId, StampActivityQuery query);
}

