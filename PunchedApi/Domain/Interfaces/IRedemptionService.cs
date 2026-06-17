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
    /// </summary>
    Task<ApiResponse<RedemptionResponse>> ClaimRewardAsync(Guid customerId, ClaimRewardRequest request);

    /// <summary>
    /// Gets redemption history for a customer.
    /// </summary>
    Task<ApiResponse<List<RedemptionResponse>>> GetMyRedemptionsAsync(Guid customerId);
}
