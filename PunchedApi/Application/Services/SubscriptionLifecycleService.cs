using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Subscription lifecycle implementation. Enforces the one-active-subscription
/// invariant and invalidates the entitlement cache on every mutation.
/// </summary>
public class SubscriptionLifecycleService : ISubscriptionLifecycleService
{
    private readonly ApplicationDbContext _context;
    private readonly IModuleEntitlementService _entitlements;
    private readonly ILogger<SubscriptionLifecycleService> _logger;

    public SubscriptionLifecycleService(
        ApplicationDbContext context,
        IModuleEntitlementService entitlements,
        ILogger<SubscriptionLifecycleService> logger)
    {
        _context = context;
        _entitlements = entitlements;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<BusinessSubscription> ChangePlanAsync(Guid businessId, Guid planId, Guid? actorUserId, string? reason = null)
    {
        var plan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == planId)
            ?? throw new InvalidOperationException($"Plan {planId} not found.");

        var now = DateTime.UtcNow;

        // The schema enforces one subscription row per business (unique
        // business_id, 1:1 with Business.CurrentSubscription), so a plan
        // change upserts that row in place.
        var subscription = await _context.BusinessSubscriptions
            .FirstOrDefaultAsync(s => s.BusinessId == businessId);

        if (subscription == null)
        {
            subscription = new BusinessSubscription { BusinessId = businessId };
            _context.BusinessSubscriptions.Add(subscription);
        }

        subscription.PlanId = plan.Id;
        subscription.Status = "active";
        subscription.StartsAt = now;
        subscription.EndsAt = ComputeEndsAt(plan, now);
        subscription.CanceledAt = null;
        await _context.SaveChangesAsync();

        _entitlements.Invalidate(businessId);
        _logger.LogWarning(
            "Subscription plan changed: business {BusinessId} → plan {PlanKey} by {ActorUserId}. Reason: {Reason}",
            businessId, plan.Key, actorUserId, reason ?? "(none)");

        return subscription;
    }

    /// <inheritdoc />
    public async Task<int> ExpireAsync(Guid businessId)
    {
        var now = DateTime.UtcNow;
        var rows = await _context.BusinessSubscriptions
            .Where(s => s.BusinessId == businessId && (s.Status == "active" || s.Status == "trial"))
            .ToListAsync();

        foreach (var row in rows)
        {
            row.Status = "expired";
            row.EndsAt ??= now;
        }

        if (rows.Count > 0)
        {
            await _context.SaveChangesAsync();
            _entitlements.Invalidate(businessId);
            _logger.LogInformation(
                "Subscription expired: business {BusinessId}, {Count} row(s) marked expired.",
                businessId, rows.Count);
        }

        return rows.Count;
    }

    /// <inheritdoc />
    public async Task<int> RenewAsync(Guid businessId, DateTime? newEndsAt = null)
    {
        var rows = await _context.BusinessSubscriptions
            .Where(s => s.BusinessId == businessId &&
                (s.Status == "expired" || s.Status == "past_due" || s.Status == "canceled"))
            .Include(s => s.Plan)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var row in rows)
        {
            row.Status = "active";
            row.StartsAt ??= now;
            row.EndsAt = newEndsAt ?? (row.EndsAt.HasValue
                ? row.EndsAt > now ? row.EndsAt : ComputeEndsAt(row.Plan, now)
                : ComputeEndsAt(row.Plan, now));
            row.CanceledAt = null;
        }

        if (rows.Count > 0)
        {
            await _context.SaveChangesAsync();
            _entitlements.Invalidate(businessId);
            _logger.LogInformation(
                "Subscription renewed: business {BusinessId}, {Count} row(s) reactivated.",
                businessId, rows.Count);
        }

        return rows.Count;
    }

    /// <inheritdoc />
    public async Task<int> CancelAsync(Guid businessId, string? reason)
    {
        var rows = await _context.BusinessSubscriptions
            .Where(s => s.BusinessId == businessId && (s.Status == "active" || s.Status == "trial"))
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var row in rows)
        {
            row.Status = "canceled";
            row.CanceledAt = now;
        }

        if (rows.Count > 0)
        {
            await _context.SaveChangesAsync();
            _entitlements.Invalidate(businessId);
            _logger.LogWarning(
                "Subscription canceled: business {BusinessId}, {Count} row(s). Reason: {Reason}",
                businessId, rows.Count, reason ?? "(none)");
        }

        return rows.Count;
    }

    /// <summary>
    /// EndsAt derived from the plan's billing interval (monthly = +1 month,
    /// yearly = +1 year); null for unrecognised intervals (no fixed end).
    /// </summary>
    internal static DateTime? ComputeEndsAt(SubscriptionPlan plan, DateTime from) =>
        plan.BillingInterval switch
        {
            "monthly" => from.AddMonths(1),
            "yearly" => from.AddYears(1),
            _ => null
        };
}
