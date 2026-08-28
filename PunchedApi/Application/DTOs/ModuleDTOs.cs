namespace PunchedApi.Application.DTOs;

/// <summary>
/// Response of GET /v1/me/modules — the caller's effective modules,
/// permissions, and current plan. Powers frontend navigation and gating.
/// </summary>
public class MyModulesResponse
{
    /// <summary>
    /// Explicitly entitled module keys (nav list — no dependency closure).
    /// </summary>
    public List<string> Entitlements { get; set; } = new();

    /// <summary>
    /// Permission codes granted to the caller's role, filtered to entitled
    /// modules.
    /// </summary>
    public List<string> Permissions { get; set; } = new();

    /// <summary>The caller's business's current plan (null for Admin/Customer).</summary>
    public CallerPlanInfo? Plan { get; set; }
}

/// <summary>Current subscription plan summary for the caller.</summary>
public class CallerPlanInfo
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>Subscription status: active, trial, expired, canceled…</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>UTC timestamp when the subscription ends (null = no fixed end).</summary>
    public DateTime? EndsAt { get; set; }
}

/// <summary>
/// Response of GET /v1/businesses/me/modules — full per-module detail for the
/// owner's module-management view.
/// </summary>
public class BusinessModulesResponse
{
    public List<BusinessModuleDetail> Modules { get; set; } = new();
    public CallerPlanInfo? Plan { get; set; }
}

/// <summary>Full entitlement detail for a single module (owner view).</summary>
public class BusinessModuleDetail
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Whether the module is enabled for the business (plan grant or override).</summary>
    public bool Enabled { get; set; }

    /// <summary>Origin of the entitlement: PLAN, OVERRIDE, or ADMIN.</summary>
    public string Source { get; set; } = "PLAN";

    /// <summary>Effective access flag: enabled AND covered by an active subscription.</summary>
    public bool HasAccess { get; set; }

    /// <summary>Module keys this module depends on.</summary>
    public List<string> Dependencies { get; set; } = new();

    /// <summary>Core modules are always available to every business.</summary>
    public bool IsCore { get; set; }
}

/// <summary>
/// Body of PUT /v1/businesses/me/modules/{moduleKey} — owner module toggle.
/// </summary>
public class SetModuleOverrideRequest
{
    /// <summary>Whether to enable or disable the module for the caller's business.</summary>
    public bool Enabled { get; set; }
}

/// <summary>
/// Body of PUT /v1/admin/businesses/{businessId}/modules/{moduleKey} —
/// admin force-enable/disable with an audit reason.
/// </summary>
public class AdminSetModuleOverrideRequest
{
    /// <summary>Whether to force-enable or force-disable the module.</summary>
    public bool Enabled { get; set; }

    /// <summary>Audit reason for the override (e.g. "Enterprise custom agreement").</summary>
    public string? Reason { get; set; }
}

/// <summary>
/// Response of GET /v1/admin/businesses/{businessId}/modules — the target
/// business's full per-module entitlement detail for the admin console.
/// </summary>
public class AdminBusinessModulesResponse : BusinessModulesResponse
{
}