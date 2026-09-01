using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Modules;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Infrastructure.Data.Seeding;

public interface IModuleCatalogSeeder
{
    /// <summary>
    /// Idempotently synchronizes the module catalog (modules, subscription
    /// plans, plan-module assignments) with the seed definitions. Safe to run
    /// on every startup, in every environment.
    /// </summary>
    Task EnsureModuleCatalogAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Seeds the module catalog at startup. Runs in all environments (unlike the
/// demo-data <c>DatabaseSeeder</c>, which is skipped in production) because
/// the entitlement system depends on these rows existing.
/// Upserts by <c>Key</c> so re-runs only add missing rows or refresh
/// display metadata — existing database identities are preserved.
/// </summary>
public sealed class ModuleCatalogSeeder : IModuleCatalogSeeder
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<ModuleCatalogSeeder> _logger;

    public ModuleCatalogSeeder(
        ApplicationDbContext dbContext,
        ILogger<ModuleCatalogSeeder> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task EnsureModuleCatalogAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var changed = false;

        // ── Modules (upsert by Key) ─────────────────────────────
        var moduleDefinitions = ModuleSeedData.GetModules();
        var existingModules = await _dbContext.Modules
            .IgnoreQueryFilters()
            .ToDictionaryAsync(m => m.Key, cancellationToken);

        foreach (var definition in moduleDefinitions)
        {
            if (existingModules.TryGetValue(definition.Key, out var existing))
            {
                // Refresh display metadata; preserve database identity.
                existing.Name = definition.Name;
                existing.Description = definition.Description;
                existing.Version = definition.Version;
                existing.IsCore = definition.IsCore;
                existing.IsActive = definition.IsActive;
                existing.DependenciesJson = definition.DependenciesJson;
            }
            else
            {
                definition.CreatedAt = now;
                _dbContext.Modules.Add(definition);
                changed = true;
                _logger.LogInformation("Seeding module: {ModuleKey}", definition.Key);
            }
        }

        // ── Subscription plans (upsert by Key) ──────────────────
        var planDefinitions = SubscriptionPlanSeedData.GetPlans();
        var existingPlans = await _dbContext.SubscriptionPlans
            .ToDictionaryAsync(p => p.Key, cancellationToken);

        foreach (var definition in planDefinitions)
        {
            if (existingPlans.TryGetValue(definition.Key, out var existing))
            {
                existing.Name = definition.Name;
                existing.Description = definition.Description;
                existing.Price = definition.Price;
                existing.BillingInterval = definition.BillingInterval;
                existing.IsActive = definition.IsActive;
            }
            else
            {
                definition.CreatedAt = now;
                _dbContext.SubscriptionPlans.Add(definition);
                changed = true;
                _logger.LogInformation("Seeding subscription plan: {PlanKey}", definition.Key);
            }
        }

        // Persist new modules/plans so their IDs are assigned before
        // building the plan-module join rows.
        await _dbContext.SaveChangesAsync(cancellationToken);

        // ── Plan-module assignments (add missing pairs) ─────────
        var modulesByKey = await _dbContext.Modules.ToDictionaryAsync(m => m.Key, cancellationToken);
        var plansByKey = await _dbContext.SubscriptionPlans.ToDictionaryAsync(p => p.Key, cancellationToken);

        var existingPairs = (await _dbContext.PlanModules
                .Select(pm => new { pm.PlanId, pm.ModuleId })
                .ToListAsync(cancellationToken))
            .Select(pm => (pm.PlanId, pm.ModuleId))
            .ToHashSet();

        foreach (var (planKey, moduleKey) in PlanModuleSeedData.GetPlanModules())
        {
            if (!plansByKey.TryGetValue(planKey, out var plan))
            {
                _logger.LogWarning("Plan-module seed skipped: plan '{PlanKey}' not found.", planKey);
                continue;
            }

            if (!modulesByKey.TryGetValue(moduleKey, out var module))
            {
                _logger.LogWarning("Plan-module seed skipped: module '{ModuleKey}' not found.", moduleKey);
                continue;
            }

            if (existingPairs.Contains((plan.Id, module.Id)))
            {
                continue;
            }

            _dbContext.PlanModules.Add(new PlanModule { PlanId = plan.Id, ModuleId = module.Id });
            changed = true;
        }

        if (changed)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Module catalog seed completed.");
        }
        else
        {
            _logger.LogDebug("Module catalog already up to date.");
        }

        // ── Backfill: every business must have a subscription ───
        // Businesses created before the module system (or before the Starter
        // plan existed) would otherwise have zero module access. Provision a
        // default active Starter subscription for any business without one.
        var defaultPlan = await _dbContext.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == "starter" && p.IsActive, cancellationToken);
        if (defaultPlan != null)
        {
            var businessIdsWithoutSubscription = await _dbContext.Businesses
                .IgnoreQueryFilters()
                .Where(b => !_dbContext.BusinessSubscriptions.Any(s => s.BusinessId == b.Id))
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);

            if (businessIdsWithoutSubscription.Count > 0)
            {
                var backfillAt = DateTime.UtcNow;
                foreach (var businessId in businessIdsWithoutSubscription)
                {
                    _dbContext.BusinessSubscriptions.Add(new BusinessSubscription
                    {
                        Id = Guid.NewGuid(),
                        BusinessId = businessId,
                        PlanId = defaultPlan.Id,
                        Status = "active",
                        StartsAt = backfillAt,
                        EndsAt = backfillAt.AddMonths(1),
                        CreatedAt = backfillAt
                    });
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
                _logger.LogInformation(
                    "Backfilled default Starter subscription for {Count} business(es).",
                    businessIdsWithoutSubscription.Count);
            }
        }
        else
        {
            _logger.LogWarning(
                "Subscription backfill skipped: no active 'starter' plan found.");
        }
    }
}