using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

public interface IRewardPayoutGateway
{
    Task<PayoutResult> ProcessAsync(Redemption redemption, Business business, CancellationToken cancellationToken = default);
}

public sealed class PayoutResult
{
    public bool Success { get; init; }
    public string? Reference { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public bool Retryable { get; init; } = true;
}
