using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Per-business module enablement row. When present, it overrides the
/// entitlement derived from the business's plan (source "OVERRIDE" or "ADMIN").
/// </summary>
public class BusinessModule : BaseEntity
{
    /// <summary>
    /// FK to the business.
    /// </summary>
    public Guid BusinessId { get; set; }

    /// <summary>
    /// FK to the module being overridden.
    /// </summary>
    public Guid ModuleId { get; set; }

    /// <summary>
    /// Whether the module is enabled for this business.
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Origin of this entitlement row: "PLAN" (mirrors the plan grant),
    /// "OVERRIDE" (owner toggle), or "ADMIN" (platform admin action).
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Source { get; set; } = "PLAN";

    /// <summary>
    /// UTC timestamp when the override took effect.
    /// </summary>
    public DateTime? OverridesAt { get; set; }

    /// <summary>
    /// FK to the admin/owner user who applied the override.
    /// </summary>
    public Guid? OverriddenByUserId { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The business this override belongs to.
    /// </summary>
    public virtual Business Business { get; set; } = null!;

    /// <summary>
    /// The module being overridden.
    /// </summary>
    public virtual Module Module { get; set; } = null!;

    /// <summary>
    /// The user who applied the override (if recorded).
    /// </summary>
    public virtual User? OverriddenByUser { get; set; }
}