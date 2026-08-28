using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
    private readonly ModuleEnforcementOptions _options;
    private readonly ILogger<ModuleCatalogSeeder> _logger;

    public ModuleCatalogSeeder(
        ApplicationDbContext dbContext,
        IOptions<ModuleEnforcementOptions> options,
        ILogger<ModuleCatalogSeeder> logger)
    {
        _dbContext = dbContext;
        _options = options.Value;
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

        await ApplyBackCompatProGrantAsync(cancellationToken);
    }

    /// <summary>
    /// Back-compat grant (G2). While <c>Modules:BackCompatGrantEnabled</c> is
    /// true (default), every business with NO active/trial subscription gets a
    /// complimentary "pro" subscription so existing businesses keep full access
    /// when module enforcement is eventually switched on. The grant only adds
    /// subscriptions — it never removes or changes existing ones.
    ///
    /// Idempotency: "grant only where no active/trial subscription exists" is
    /// restart-safe. NOTE: new businesses registered after rollout would also
    /// match this rule — set <c>Modules:BackCompatGrantEnabled=false</c> after
    /// the migration grace period so billing owns subscription creation.
    ///
    /// Runs in ALL environments: this method is invoked from
    /// <c>EnsureModuleCatalogAsync</c>, which Program.cs calls on every boot
    /// after migrations, outside any demo-data <c>SeedOptions</c> skip.
    /// </summary>
    private async Task ApplyBackCompatProGrantAsync(CancellationToken cancellationToken)
    {
        if (!_options.BackCompatGrantEnabled)
        {
            _logger.LogDebug("Back-compat pro grant disabled (Modules:BackCompatGrantEnabled=false).");
            return;
        }

        var proPlan = await _dbContext.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Key == "pro", cancellationToken);
        if (proPlan == null)
        {
            _logger.LogWarning("Back-compat pro grant skipped: 'pro' plan not found in catalog.");
            return;
        }

        var businessIdsWithActiveSubscription = await _dbContext.BusinessSubscriptions
            .Where(s => s.Status == "active" || s.Status == "trial")
            .Select(s => s.BusinessId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var businessIds = await _dbContext.Businesses
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        var granted = 0;
        foreach (var businessId in businessIds)
        {
            if (businessIdsWithActiveSubscription.Contains(businessId))
            {
                continue;
            }

            _dbContext.BusinessSubscriptions.Add(new BusinessSubscription
            {
                BusinessId = businessId,
                PlanId = proPlan.Id,
                Status = "active",
                StartsAt = DateTime.UtcNow,
                EndsAt = null
            });
            granted++;
        }

        if (granted > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("Back-compat pro grant applied to {Count} businesses.", granted);
    }
}