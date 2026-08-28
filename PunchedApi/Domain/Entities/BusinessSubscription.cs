using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// A business's subscription to a <see cref="SubscriptionPlan"/>.
/// One active subscription per business (unique index on BusinessId).
/// </summary>
public class BusinessSubscription : BaseEntity
{
    /// <summary>
    /// FK to the subscribed business.
    /// </summary>
    public Guid BusinessId { get; set; }

    /// <summary>
    /// FK to the subscription plan.
    /// </summary>
    public Guid PlanId { get; set; }

    /// <summary>
    /// Lifecycle status: "active", "trial", "past_due", "canceled", "expired".
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "active";

    /// <summary>
    /// UTC timestamp when the subscription started.
    /// </summary>
    public DateTime? StartsAt { get; set; }

    /// <summary>
    /// UTC timestamp when the subscription ends (null = no fixed end).
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// UTC timestamp when the subscription was canceled (null if not canceled).
    /// </summary>
    public DateTime? CanceledAt { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The subscribed business.
    /// </summary>
    public virtual Business Business { get; set; } = null!;

    /// <summary>
    /// The subscription plan.
    /// </summary>
    public virtual SubscriptionPlan Plan { get; set; } = null!;
}