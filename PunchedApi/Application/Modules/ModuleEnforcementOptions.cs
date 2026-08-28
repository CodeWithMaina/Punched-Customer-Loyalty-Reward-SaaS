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
}