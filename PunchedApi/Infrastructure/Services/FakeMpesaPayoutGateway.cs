using Microsoft.Extensions.Logging;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Infrastructure.Services;

public sealed class FakeMpesaPayoutGateway : IRewardPayoutGateway
{
    private readonly ILogger<FakeMpesaPayoutGateway> _logger;

    public FakeMpesaPayoutGateway(ILogger<FakeMpesaPayoutGateway> logger)
    {
        _logger = logger;
    }

    public Task<PayoutResult> ProcessAsync(Redemption redemption, Business business, CancellationToken cancellationToken = default)
    {
        // Deterministic idempotency key derived from redemption id avoids duplicate refs across retries.
        var refToken = $"MPESA-{redemption.Id:N}".ToUpperInvariant();

        _logger.LogInformation(
            "Simulated payout processed for redemption {RedemptionId} business {BusinessId}",
            redemption.Id,
            business.Id);

        return Task.FromResult(new PayoutResult
        {
            Success = true,
            Reference = refToken
        });
    }
}
