using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// A functional module (feature area) in the platform's module catalog.
/// Modules are the unit of subscription gating: plans bundle modules and
/// businesses receive entitlements to modules through their active plan.
/// </summary>
public class Module : BaseEntity
{
    /// <summary>
    /// Stable, lowercase unique key (e.g. "customers", "stamps").
    /// Used by code to look up entitlements — never rename an existing key.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of what the module provides.
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Module manifest version (semver). Defaults to 1.0.0.
    /// </summary>
    [MaxLength(20)]
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// Core modules are always available to every business regardless of plan.
    /// </summary>
    public bool IsCore { get; set; }

    /// <summary>
    /// Soft availability flag. Inactive modules are excluded from entitlements.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// JSON array of module keys this module depends on
    /// (e.g. ["customers","staff"]). Null when the module has no dependencies.
    /// </summary>
    public string? DependenciesJson { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// Plans that include this module.
    /// </summary>
    public virtual ICollection<PlanModule> PlanModules { get; set; } = new List<PlanModule>();

    /// <summary>
    /// Per-business enablement overrides for this module.
    /// </summary>
    public virtual ICollection<BusinessModule> BusinessModules { get; set; } = new List<BusinessModule>();
}