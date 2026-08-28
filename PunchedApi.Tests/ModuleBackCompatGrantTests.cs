using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PunchedApi.Application.Modules;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Data.Seeding;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// G2 back-compat pro grant: the module catalog seeder must idempotently give
/// every business with no active/trial subscription an active "pro"
/// subscription, gated by Modules:BackCompatGrantEnabled.
/// Uses the EF InMemory database pattern.
/// </summary>
public class ModuleBackCompatGrantTests : IDisposable
{
    private readonly ApplicationDbContext _db;

    public ModuleBackCompatGrantTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ApplicationDbContext(options);

        _db.Modules.AddRange(ModuleSeedData.GetModules());
        _db.SubscriptionPlans.AddRange(SubscriptionPlanSeedData.GetPlans());
        _db.SaveChanges();

        var modules = _db.Modules.ToDictionary(m => m.Key);
        var plans = _db.SubscriptionPlans.ToDictionary(p => p.Key);
        foreach (var (planKey, moduleKey) in PlanModuleSeedData.GetPlanModules())
        {
            _db.PlanModules.Add(new PlanModule { PlanId = plans[planKey].Id, ModuleId = modules[moduleKey].Id });
        }

        _db.Businesses.Add(new Business
        {
            Id = Guid.NewGuid(), Name = "No Subscription Biz",
            Category = "salon", Location = "Nairobi", MpesaNumber = "123456"
        });
        _db.Businesses.Add(new Business
        {
            Id = Guid.NewGuid(), Name = "Starter Biz",
            Category = "salon", Location = "Nairobi", MpesaNumber = "123456"
        });
        _db.SaveChanges();

        var starterPlan = _db.SubscriptionPlans.Single(p => p.Key == "starter");
        _db.BusinessSubscriptions.Add(new BusinessSubscription
        {
            BusinessId = _db.Businesses.Single(b => b.Name == "Starter Biz").Id,
            PlanId = starterPlan.Id,
            Status = "active",
            StartsAt = DateTime.UtcNow.AddDays(-10)
        });
        _db.SaveChanges();
    }

    private ModuleCatalogSeeder CreateSeeder(bool backCompatGrantEnabled = true) => new(
        _db,
        Options.Create(new ModuleEnforcementOptions
        {
            EnforcementEnabled = false,
            BackCompatGrantEnabled = backCompatGrantEnabled
        }),
        NullLogger<ModuleCatalogSeeder>.Instance);

    private Guid BusinessId(string name) => _db.Businesses.Single(b => b.Name == name).Id;

    [Fact]
    public async Task BusinessWithoutSubscription_GetsExactlyOneActiveProSubscription()
    {
        var noSubId = BusinessId("No Subscription Biz");

        await CreateSeeder().EnsureModuleCatalogAsync();

        var subscriptions = _db.BusinessSubscriptions
            .Where(s => s.BusinessId == noSubId).ToList();
        var proPlanId = _db.SubscriptionPlans.Single(p => p.Key == "pro").Id;

        Assert.Single(subscriptions);
        var grant = subscriptions[0];
        Assert.Equal(proPlanId, grant.PlanId);
        Assert.Equal("active", grant.Status);
        Assert.NotNull(grant.StartsAt);
        Assert.Null(grant.EndsAt);

        // Entitlements: everything the pro plan grants is now accessible.
        var entitlementService = new ModuleEntitlementService(
            _db, NullLogger<ModuleEntitlementService>.Instance);
        var result = await entitlementService.GetBusinessModulesAsync(noSubId);
        Assert.Equal("pro", result.CurrentPlan?.Key);

        var proModuleKeys = PlanModuleSeedData.GetPlanModules()
            .Where(pm => pm.PlanKey == "pro")
            .Select(pm => pm.ModuleKey)
            .ToHashSet(StringComparer.Ordinal);

        Assert.All(
            result.Modules.Where(m => proModuleKeys.Contains(m.Key)),
            m => Assert.True(m.HasAccess, $"{m.Key} should have access under pro"));
        Assert.All(
            result.Modules.Where(m => !proModuleKeys.Contains(m.Key)),
            m => Assert.False(m.HasAccess, $"{m.Key} must NOT have access under pro"));
    }

    [Fact]
    public async Task BusinessWithActiveStarterSubscription_IsUntouched()
    {
        var starterBizId = BusinessId("Starter Biz");
        var before = _db.BusinessSubscriptions
            .Where(s => s.BusinessId == starterBizId).ToList().Single();

        await CreateSeeder().EnsureModuleCatalogAsync();

        var after = _db.BusinessSubscriptions
            .Where(s => s.BusinessId == starterBizId).ToList();
        Assert.Single(after);
        Assert.Equal(before.Id, after[0].Id);
        Assert.Equal("starter", _db.SubscriptionPlans.Single(p => p.Id == after[0].PlanId).Key);
        Assert.Equal("active", after[0].Status);
    }

    [Fact]
    public async Task RunningSeederTwice_StillExactlyOneSubscriptionPerBusiness()
    {
        await CreateSeeder().EnsureModuleCatalogAsync();
        await CreateSeeder().EnsureModuleCatalogAsync();

        var counts = _db.BusinessSubscriptions.ToList()
            .GroupBy(s => s.BusinessId)
            .ToDictionary(g => g.Key, g => g.Count());

        Assert.All(counts.Values, count => Assert.Equal(1, count));
        Assert.Equal(2, counts.Count);
    }

    [Fact]
    public async Task BackCompatGrantDisabled_NoGrantsInserted()
    {
        var noSubId = BusinessId("No Subscription Biz");

        await CreateSeeder(backCompatGrantEnabled: false).EnsureModuleCatalogAsync();

        Assert.Empty(_db.BusinessSubscriptions.Where(s => s.BusinessId == noSubId));
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}
