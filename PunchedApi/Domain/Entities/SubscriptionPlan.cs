using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// A subscription plan offered on the platform (e.g. Starter, Growth, Pro).
/// A plan bundles a set of modules via <see cref="PlanModule"/> join rows.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    /// <summary>
    /// Stable, lowercase unique key (e.g. "starter", "pro").
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
    /// Optional description of the plan.
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Recurring price in the platform currency (KES).
    /// </summary>
    [Range(0, 1_000_000)]
    public decimal Price { get; set; }

    /// <summary>
    /// Billing interval: "monthly" or "yearly".
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string BillingInterval { get; set; } = "monthly";

    /// <summary>
    /// Soft availability flag. Inactive plans cannot be subscribed to.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// Modules included in this plan.
    /// </summary>
    public virtual ICollection<PlanModule> PlanModules { get; set; } = new List<PlanModule>();

    /// <summary>
    /// Business subscriptions currently on this plan.
    /// </summary>
    public virtual ICollection<BusinessSubscription> BusinessSubscriptions { get; set; } = new List<BusinessSubscription>();
}