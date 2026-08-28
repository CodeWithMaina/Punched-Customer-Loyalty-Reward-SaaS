using Microsoft.EntityFrameworkCore;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Plain service that flips overdue subscriptions to expired. Extracted from
/// the worker so it can be unit-tested deterministically against a fixed
/// "as of" timestamp.
/// </summary>
public class SubscriptionExpiryService
{
    private readonly ApplicationDbContext _context;
    private readonly IModuleEntitlementService _entitlements;
    private readonly ILogger<SubscriptionExpiryService> _logger;

    public SubscriptionExpiryService(
        ApplicationDbContext context,
        IModuleEntitlementService entitlements,
        ILogger<SubscriptionExpiryService> logger)
    {
        _context = context;
        _entitlements = entitlements;
        _logger = logger;
    }

    /// <summary>
    /// Expires every subscription with Status ∈ {active, trial, past_due}
    /// whose EndsAt is before <paramref name="asOf"/>. Subscriptions without
    /// a fixed EndsAt never expire. Invalidates the entitlement cache for
    /// each affected business.
    /// </summary>
    /// <returns>The number of businesses whose subscriptions were expired.</returns>
    public async Task<int> ExpireOverdueAsync(DateTime asOf)
    {
        var overdue = await _context.BusinessSubscriptions
            .Where(s => (s.Status == "active" || s.Status == "trial" || s.Status == "past_due") &&
                s.EndsAt != null && s.EndsAt < asOf)
            .ToListAsync();

        if (overdue.Count == 0) return 0;

        foreach (var row in overdue)
        {
            row.Status = "expired";
        }

        await _context.SaveChangesAsync();

        var businessIds = overdue.Select(s => s.BusinessId).Distinct().ToList();
        foreach (var businessId in businessIds)
        {
            _entitlements.Invalidate(businessId);
        }

        _logger.LogInformation(
            "Subscription expiry sweep: {Count} subscription(s) across {Businesses} business(es) expired.",
            overdue.Count, businessIds.Count);

        return businessIds.Count;
    }
}
