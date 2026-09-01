namespace PunchedApi.Application.Settings;

/// <summary>
/// Billing configuration (used by the payment webhook).
/// </summary>
public sealed class BillingOptions
{
    public const string SectionName = "Billing";

    /// <summary>
    /// Shared secret used to verify the payment webhook HMAC signature
    /// (<c>X-Punched-Signature</c> header = HMAC-SHA256 hex over the raw body).
    /// When empty, the webhook is rejected (fail-closed).
    /// </summary>
    public string WebhookSecret { get; set; } = string.Empty;
}