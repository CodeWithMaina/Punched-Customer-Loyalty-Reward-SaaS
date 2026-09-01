using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Provisions a default (Starter) subscription for a newly created business so
/// it has immediate module access instead of being locked out until an admin
/// assigns a plan. Best-effort: no-op when the Starter plan does not exist or a
/// subscription already exists; never throws (so onboarding can never fail due
/// to subscription provisioning).
/// </summary>
public interface ISubscriptionProvisioningService
{
    Task EnsureDefaultSubscriptionAsync(Guid businessId, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public sealed class SubscriptionProvisioningService : ISubscriptionProvisioningService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SubscriptionProvisioningService> _logger;

    public SubscriptionProvisioningService(ApplicationDbContext context, ILogger<SubscriptionProvisioningService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task EnsureDefaultSubscriptionAsync(Guid businessId, CancellationToken cancellationToken = default)
    {
        try
        {
            var hasSubscription = await _context.BusinessSubscriptions
                .AnyAsync(s => s.BusinessId == businessId, cancellationToken);
            if (hasSubscription)
            {
                return;
            }

            var starter = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Key == "starter" && p.IsActive, cancellationToken);
            if (starter == null)
            {
                _logger.LogInformation(
                    "No active Starter plan available; skipped default subscription provisioning for business {BusinessId}.",
                    businessId);
                return;
            }

            var now = DateTime.UtcNow;
            _context.BusinessSubscriptions.Add(new BusinessSubscription
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                PlanId = starter.Id,
                Status = "active",
                StartsAt = now,
                EndsAt = now.AddMonths(1),
                CreatedAt = now
            });
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Provisioned default Starter subscription for business {BusinessId}.", businessId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to provision default subscription for business {BusinessId}.", businessId);
        }
    }
}