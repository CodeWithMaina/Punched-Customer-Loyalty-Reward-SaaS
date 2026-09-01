namespace PunchedApi.Domain.Entities;

/// <summary>
/// Lifecycle of a reward redemption: claimed (Pending) → Fulfilled by the
/// business at the counter, or Cancelled (stamps restored).
/// </summary>
public enum RedemptionStatus
{
    Pending = 0,
    Fulfilled = 1,
    Cancelled = 2
}

/// <summary>Helpers for mapping the status enum to the legacy API strings.</summary>
public static class RedemptionStatusExtensions
{
    public static string ToApiString(this RedemptionStatus status) => status switch
    {
        RedemptionStatus.Pending => "pending",
        RedemptionStatus.Fulfilled => "fulfilled",
        RedemptionStatus.Cancelled => "cancelled",
        _ => "pending"
    };

    public static RedemptionStatus FromApiString(string status) => status?.ToLowerInvariant() switch
    {
        "fulfilled" or "completed" => RedemptionStatus.Fulfilled,
        "cancelled" or "failed" => RedemptionStatus.Cancelled,
        _ => RedemptionStatus.Pending
    };
}
