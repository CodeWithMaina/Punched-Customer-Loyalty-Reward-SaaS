namespace PunchedApi.Application.DTOs;

/// <summary>Item of GET /v1/plans — an active plan with its bundled modules.</summary>
public class PlanSummary
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Recurring price in KES.</summary>
    public decimal Price { get; set; }

    /// <summary>Billing interval: "monthly" or "yearly".</summary>
    public string BillingInterval { get; set; } = "monthly";

    /// <summary>Module keys included in this plan.</summary>
    public List<string> Modules { get; set; } = new();
}

/// <summary>Body of PUT /v1/admin/businesses/{businessId}/subscription.</summary>
public class AdminAssignPlanRequest
{
    /// <summary>Stable plan key (e.g. "growth").</summary>
    public string PlanKey { get; set; } = string.Empty;

    /// <summary>Audit reason for the manual assignment.</summary>
    public string? Reason { get; set; }
}

/// <summary>Body of POST /v1/businesses/me/subscription/upgrade.</summary>
public class UpgradePlanRequest
{
    /// <summary>Stable plan key the owner wants to move to.</summary>
    public string PlanKey { get; set; } = string.Empty;
}

/// <summary>Result of POST /v1/businesses/me/subscription/upgrade.</summary>
public class UpgradePlanResponse
{
    /// <summary>Plan key that is now active for the business.</summary>
    public string PlanKey { get; set; } = string.Empty;

    /// <summary>Status after the upgrade (always "active" with the fake gateway).</summary>
    public string Status { get; set; } = "active";

    /// <summary>Deterministic payment reference from the billing gateway.</summary>
    public string? PaymentReference { get; set; }
}

/// <summary>
/// Payment webhook payload (POST /v1/webhooks/payments). Documented contract:
/// { "event": "payment.completed", "reference": "BILL-…", "businessId": "…",
/// "planKey": "growth", "occurredAt": "2026-01-01T00:00:00Z" }.
/// A "payment.completed" event calls ChangePlanAsync (or RenewAsync when the
/// business is already on the plan). Signature verification is a no-op in the
/// fake gateway and mandatory in a real one.
/// </summary>
public class PaymentWebhookRequest
{
    public string Event { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public Guid BusinessId { get; set; }
    public string PlanKey { get; set; } = string.Empty;
    public DateTime? OccurredAt { get; set; }
}
