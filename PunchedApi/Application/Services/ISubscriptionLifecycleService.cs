using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>
/// Owns the subscription lifecycle (G4): plan changes, expiry, renewal and
/// cancellation. Every mutation invalidates the business's entitlement cache
/// via <see cref="IModuleEntitlementService.Invalidate"/> so module access
/// reflects the new subscription state immediately.
/// </summary>
public interface ISubscriptionLifecycleService
{
    /// <summary>
    /// Upserts the business's one active subscription: marks any current
    /// active/trial row canceled and adds a new active row on the target plan
    /// (StartsAt=now, EndsAt derived from the plan's billing interval).
    /// </summary>
    /// <returns>The new active subscription row.</returns>
    Task<BusinessSubscription> ChangePlanAsync(Guid businessId, Guid planId, Guid? actorUserId, string? reason = null);

    /// <summary>Active/trial subscriptions → expired (EndsAt set if null).</summary>
    Task<int> ExpireAsync(Guid businessId);

    /// <summary>
    /// Expired/past_due/canceled subscriptions → active, extending EndsAt
    /// (or by one billing interval of the current plan when not supplied).
    /// </summary>
    Task<int> RenewAsync(Guid businessId, DateTime? newEndsAt = null);

    /// <summary>Active/trial subscriptions → canceled (CanceledAt set).</summary>
    Task<int> CancelAsync(Guid businessId, string? reason);
}
