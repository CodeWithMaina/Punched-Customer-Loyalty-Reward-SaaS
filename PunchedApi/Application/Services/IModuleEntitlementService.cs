using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>
/// Resolves effective module entitlements for a business by combining the
/// business's active subscription plan with any per-business overrides.
/// </summary>
public interface IModuleEntitlementService
{
    /// <summary>
    /// Returns the full module entitlement list for a business, including
    /// the current plan and per-module access flags.
    /// </summary>
    /// <param name="businessId">The business to resolve entitlements for.</param>
    /// <param name="userId">Optional caller (reserved for future per-user scoping).</param>
    Task<ModuleEntitlementResult> GetBusinessModulesAsync(Guid businessId, Guid? userId = null);

    /// <summary>
    /// Convenience check: does the business have access to the given module?
    /// </summary>
    Task<bool> IsModuleEnabledAsync(Guid businessId, string moduleKey);

    /// <summary>
    /// Returns the set of module keys the business currently has access to.
    /// </summary>
    Task<HashSet<string>> GetEffectiveModuleKeysAsync(Guid businessId);

    /// <summary>
    /// Drops the cached entitlement resolution for a business so the next
    /// read re-resolves from the database. Must be called after any mutation
    /// of the business's subscription, plan, or module overrides.
    /// </summary>
    void Invalidate(Guid businessId);

    /// <summary>
    /// Authoring-time dependency validation (plan §14.1, G7): given the full
    /// intended override configuration for a business, returns one problem
    /// string per dependency violation, e.g.
    /// "module 'analytics' enabled without dependency 'loyalty'".
    /// An empty list means the configuration is dependency-consistent.
    /// </summary>
    IReadOnlyList<string> ValidateConfiguration(IEnumerable<(string ModuleKey, bool Enabled)> overrides);
}

/// <summary>
/// The effective entitlement state for a business.
/// </summary>
public class ModuleEntitlementResult
{
    /// <summary>
    /// One entitlement entry per active module in the catalog.
    /// </summary>
    public List<ModuleEntitlement> Modules { get; set; } = new();

    /// <summary>
    /// The business's current subscription plan, if any.
    /// </summary>
    public SubscriptionPlan? CurrentPlan { get; set; }

    /// <summary>
    /// UTC timestamp when the current subscription ends (null = no fixed end).
    /// </summary>
    public DateTime? SubscriptionEndsAt { get; set; }

    /// <summary>
    /// Status of the subscription backing <see cref="CurrentPlan"/>:
    /// "active", "trial", or null when there is no active subscription.
    /// </summary>
    public string? SubscriptionStatus { get; set; }
}

/// <summary>
/// A single module's resolved entitlement for a business.
/// </summary>
public class ModuleEntitlement
{
    /// <summary>
    /// Module identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Stable lowercase module key (e.g. "customers").
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Display name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether the module is enabled for the business (plan grant or override).
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Origin of the entitlement: "PLAN", "OVERRIDE", or "ADMIN".
    /// </summary>
    public string Source { get; set; } = "PLAN";

    /// <summary>
    /// Module keys this module depends on.
    /// </summary>
    public List<string> Dependencies { get; set; } = new();

    /// <summary>
    /// Core modules are always available to every business.
    /// </summary>
    public bool IsCore { get; set; }

    /// <summary>
    /// Effective access flag: enabled AND covered by an active subscription.
    /// </summary>
    public bool HasAccess { get; set; }
}