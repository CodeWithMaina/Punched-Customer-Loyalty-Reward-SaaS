using Microsoft.Extensions.Logging;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Services;

/// <summary>
/// Deterministic dev/test billing gateway: always succeeds with a stable
/// reference. TODO(billing): replace with a real M-Pesa STK push / Stripe
/// integration that verifies webhook signatures before launch.
/// </summary>
public sealed class FakeMpesaStkGateway : IBillingGateway
{
    private readonly ILogger<FakeMpesaStkGateway> _logger;

    public FakeMpesaStkGateway(ILogger<FakeMpesaStkGateway> logger)
    {
        _logger = logger;
    }

    public Task<PaymentInitiationResult> InitiateAsync(SubscriptionPlan plan, Guid businessId, CancellationToken cancellationToken = default)
    {
        var reference = $"BILL-{plan.Key.ToUpperInvariant()}-{businessId.ToString("N")[..12].ToUpperInvariant()}";

        _logger.LogInformation(
            "Simulated STK push initiated for business {BusinessId} plan {PlanKey} amount {Amount} KES (ref {Reference}).",
            businessId, plan.Key, plan.Price, reference);

        return Task.FromResult(new PaymentInitiationResult { Success = true, Reference = reference });
    }

    public bool VerifyWebhookSignature(string payload)
    {
        // The fake gateway accepts every payload. Real implementations must
        // verify the provider's HMAC signature here.
        return true;
    }
}
