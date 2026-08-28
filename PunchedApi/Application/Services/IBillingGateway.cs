using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>
/// Billing gateway seam (G11). The production implementation will call a real
/// payment provider (M-Pesa STK push / Stripe) and verify webhook signatures.
/// TODO(billing): replace FakeMpesaStkGateway with a real gateway integration
/// before public launch; the interface is the contract that must not change.
/// </summary>
public interface IBillingGateway
{
    /// <summary>
    /// Initiates a payment for the given plan on behalf of the business.
    /// Returns a deterministic payment reference the client can poll / that
    /// the webhook will confirm.
    /// </summary>
    Task<PaymentInitiationResult> InitiateAsync(SubscriptionPlan plan, Guid businessId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a webhook payload's authenticity. The fake gateway accepts
    /// everything; a real implementation must verify the provider signature.
    /// </summary>
    bool VerifyWebhookSignature(string payload);
}

/// <summary>Result of initiating a payment.</summary>
public class PaymentInitiationResult
{
    public bool Success { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}
