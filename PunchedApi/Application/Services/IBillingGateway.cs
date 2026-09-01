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
    /// Validates a webhook payload's authenticity. Implementations MUST verify
    /// the provider signature (HMAC-SHA256 hex over the raw body, shared
    /// secret) and FAIL CLOSED when the secret is not configured.
    /// </summary>
    /// <param name="payload">The exact raw request body bytes.</param>
    /// <param name="signature">The <c>X-Punched-Signature</c> header value.</param>
    bool VerifyWebhookSignature(byte[] payload, string? signature);
}

/// <summary>Result of initiating a payment.</summary>
public class PaymentInitiationResult
{
    public bool Success { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}
