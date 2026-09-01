using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Service interface for reward redemptions.
/// Handles claiming rewards and retrieving redemption history.
/// </summary>
public interface IRedemptionService
{
    /// <summary>
    /// Claims a reward for a card that has reached its stamp threshold.
    /// Creates a Redemption record, resets stamps, and increments redemption count.
    /// Supports an optional idempotency key for safe client retries.
    /// </summary>
    Task<ApiResponse<RedemptionResponse>> ClaimRewardAsync(Guid customerId, ClaimRewardRequest request, string? idempotencyKey = null);

    /// <summary>
    /// Gets redemption history for a customer.
    /// </summary>
    Task<ApiResponse<List<RedemptionResponse>>> GetMyRedemptionsAsync(Guid customerId);

    /// <summary>Business + Staff: list pending redemptions for the scoped business (fulfilment queue).</summary>
    Task<ApiResponse<List<RedemptionResponse>>> GetPendingForBusinessAsync(Guid userId);

    /// <summary>
    /// Fulfils a Pending redemption by verifying the 6-char code. Business + Staff.
    /// Locks the code after 5 wrong attempts.
    /// </summary>
    Task<ApiResponse<FulfillRedemptionResponse>> FulfillRedemptionAsync(Guid userId, FulfillRedemptionRequest request);

    /// <summary>
    /// Cancels a Pending redemption (Business only) and restores the consumed stamps.
    /// </summary>
    Task<ApiResponse<CancelRedemptionResponse>> CancelRedemptionAsync(Guid actorUserId, Guid redemptionId, CancelRedemptionRequest request);
}
