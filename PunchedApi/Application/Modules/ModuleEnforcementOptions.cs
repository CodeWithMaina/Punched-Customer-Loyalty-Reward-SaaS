namespace PunchedApi.Application.Modules;

/// <summary>
/// Module enforcement settings. <see cref="EnforcementEnabled"/> defaults to
/// false during rollout: guards return "allowed" while the UI iterates on real
/// entitlement data. Flip to true (local/staging first) in Phase 7.
/// </summary>
public class ModuleEnforcementOptions
{
    public const string SectionName = "Modules";

    /// <summary>
    /// When false, all module checks pass through (zero behavior change).
    /// When true, unentitled module access returns 403 MODULE_DISABLED.
    /// </summary>
    public bool EnforcementEnabled { get; set; }

    /// <summary>
    /// Back-compat one-shot grant (G2): while true, startup seeding gives every
    /// business that has NO active/trial subscription a complimentary "pro"
    /// subscription so existing businesses keep full access when enforcement
    /// flips on. The rule is restart-idempotent, but new businesses registered
    /// after rollout would also match it — so operators should set this to
    /// false after the migration grace period (subscription lifecycle/billing
    /// then owns subscription creation).
    /// </summary>
    public bool BackCompatGrantEnabled { get; set; } = true;
}