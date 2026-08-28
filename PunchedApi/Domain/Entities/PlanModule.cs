namespace PunchedApi.Domain.Entities;

/// <summary>
/// Join entity associating a <see cref="Module"/> with a <see cref="SubscriptionPlan"/>.
/// The composite key is (PlanId, ModuleId).
/// </summary>
public class PlanModule
{
    /// <summary>
    /// FK to the subscription plan.
    /// </summary>
    public Guid PlanId { get; set; }

    /// <summary>
    /// FK to the module included in the plan.
    /// </summary>
    public Guid ModuleId { get; set; }

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// The subscription plan.
    /// </summary>
    public virtual SubscriptionPlan Plan { get; set; } = null!;

    /// <summary>
    /// The module included in the plan.
    /// </summary>
    public virtual Module Module { get; set; } = null!;
}