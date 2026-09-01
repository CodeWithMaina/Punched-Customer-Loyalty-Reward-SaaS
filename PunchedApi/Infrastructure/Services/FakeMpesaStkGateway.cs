using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using PunchedApi.Application.Settings;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Services;

/// <summary>
/// Deterministic dev/test billing gateway: always succeeds with a stable
/// reference. Webhook authenticity is enforced with HMAC-SHA256 over the raw
/// body using <c>Billing:WebhookSecret</c> (fail-closed when unset) so the
/// payments webhook can never be used to grant plans without the secret.
/// </summary>
public sealed class FakeMpesaStkGateway : IBillingGateway
{
    private readonly BillingOptions _options;
    private readonly ILogger<FakeMpesaStkGateway> _logger;

    public FakeMpesaStkGateway(IOptions<BillingOptions> options, ILogger<FakeMpesaStkGateway> logger)
    {
        _options = options.Value;
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

    public bool VerifyWebhookSignature(byte[] payload, string? signature)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookSecret))
        {
            // Fail closed: no secret configured → no webhook is trusted.
            _logger.LogWarning(
                "Payment webhook rejected: Billing:WebhookSecret is not configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signature))
            return false;

        byte[] secret = Encoding.UTF8.GetBytes(_options.WebhookSecret);
        byte[] expected = HMACSHA256.HashData(secret, payload);
        byte[] provided;
        try
        {
            provided = Convert.FromHexString(signature.Trim());
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expected, provided);
    }
}
