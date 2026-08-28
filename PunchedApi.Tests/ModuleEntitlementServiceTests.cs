using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// Unit tests for ModuleEntitlementService resolution:
/// plan grants → override precedence → subscription status/expiry gating.
/// Uses the real seed catalog definitions against an EF InMemory database.
/// </summary>
public class ModuleEntitlementServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly ModuleEntitlementService _service;
    private readonly Business _business;
    private readonly Guid _businessId = Guid.NewGuid();

    public ModuleEntitlementServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _db = new ApplicationDbContext(options);
        _service = new ModuleEntitlementService(_db, TestHelpers.CreateLogger<ModuleEntitlementService>());

        // Seed the module catalog from the real seed definitions.
        _db.Modules.AddRange(ModuleSeedData.GetModules());
        _db.SubscriptionPlans.AddRange(SubscriptionPlanSeedData.GetPlans());
        _db.SaveChanges();

        var modules = _db.Modules.ToDictionary(m => m.Key);
        var plans = _db.SubscriptionPlans.ToDictionary(p => p.Key);
        foreach (var (planKey, moduleKey) in PlanModuleSeedData.GetPlanModules())
        {
            _db.PlanModules.Add(new PlanModule { PlanId = plans[planKey].Id, ModuleId = modules[moduleKey].Id });
        }

        _business = new Business
        {
            Id = _businessId,
            Name = "Test Salon",
            Category = "salon",
            Location = "Nairobi",
            MpesaNumber = "123456"
        };
        _db.Businesses.Add(_business);
        _db.SaveChanges();
    }

    private async Task SubscribeAsync(string planKey, string status = "active", DateTime? endsAt = null)
    {
        var plan = _db.SubscriptionPlans.Single(p => p.Key == planKey);
        _db.BusinessSubscriptions.Add(new BusinessSubscription
        {
            BusinessId = _businessId,
            PlanId = plan.Id,
            Status = status,
            StartsAt = DateTime.UtcNow.AddDays(-30),
            EndsAt = endsAt
        });
        await _db.SaveChangesAsync();
    }

    private async Task AddOverrideAsync(string moduleKey, bool isEnabled, string source = "OVERRIDE")
    {
        var module = _db.Modules.Single(m => m.Key == moduleKey);
        _db.BusinessModules.Add(new BusinessModule
        {
            BusinessId = _businessId,
            ModuleId = module.Id,
            IsEnabled = isEnabled,
            Source = source,
            OverridesAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task NoSubscription_NoModuleHasAccess()
    {
        var result = await _service.GetBusinessModulesAsync(_businessId);

        Assert.Null(result.CurrentPlan);
        Assert.Null(result.SubscriptionEndsAt);
        Assert.NotEmpty(result.Modules);
        Assert.All(result.Modules, m => Assert.False(m.HasAccess));
    }

    [Fact]
    public async Task ActiveSubscription_PlanModulesHaveAccess()
    {
        await SubscribeAsync("pro");

        var result = await _service.GetBusinessModulesAsync(_businessId);

        Assert.NotNull(result.CurrentPlan);
        Assert.Equal("pro", result.CurrentPlan!.Key);

        var keys = result.Modules.Where(m => m.HasAccess).Select(m => m.Key).ToHashSet();
        Assert.Superset(new HashSet<string> { "customers", "staff", "settings", "appointments", "stamps", "notifications", "loyalty", "analytics" }, keys);
        // Not in the pro plan:
        Assert.DoesNotContain("rewards", keys);
        Assert.DoesNotContain("programs", keys);
    }

    [Fact]
    public async Task ExpiredSubscription_PlanModulesLoseAccess()
    {
        await SubscribeAsync("pro", endsAt: DateTime.UtcNow.AddDays(-1));

        var result = await _service.GetBusinessModulesAsync(_businessId);

        Assert.All(result.Modules, m => Assert.False(m.HasAccess));
    }

    [Fact]
    public async Task TrialSubscription_PlanModulesHaveAccess()
    {
        await SubscribeAsync("growth", status: "trial");

        var keys = await _service.GetEffectiveModuleKeysAsync(_businessId);

        Assert.Superset(new HashSet<string> { "customers", "appointments", "stamps", "notifications" }, keys);
        Assert.DoesNotContain("loyalty", keys);
    }

    [Fact]
    public async Task CanceledSubscription_NoAccess()
    {
        await SubscribeAsync("pro", status: "canceled");

        var enabled = await _service.IsModuleEnabledAsync(_businessId, "customers");

        Assert.False(enabled);
    }

    [Fact]
    public async Task OverrideDisable_BeatsPlanGrant()
    {
        await SubscribeAsync("pro");
        await AddOverrideAsync("analytics", isEnabled: false);

        var result = await _service.GetBusinessModulesAsync(_businessId);

        var analytics = result.Modules.Single(m => m.Key == "analytics");
        Assert.False(analytics.IsEnabled);
        Assert.False(analytics.HasAccess);
        Assert.Equal("OVERRIDE", analytics.Source);
    }

    [Fact]
    public async Task OverrideEnable_GrantsModuleOutsidePlan()
    {
        await SubscribeAsync("starter"); // no rewards module in starter
        await AddOverrideAsync("rewards", isEnabled: true, source: "ADMIN");

        var result = await _service.GetBusinessModulesAsync(_businessId);

        var rewards = result.Modules.Single(m => m.Key == "rewards");
        Assert.True(rewards.IsEnabled);
        Assert.True(rewards.HasAccess);
        Assert.Equal("ADMIN", rewards.Source);
    }

    [Fact]
    public async Task CoreModules_NotImplicitlyGranted_WithoutSubscription()
    {
        // Core modules are flagged in the catalog, but access still requires
        // an active subscription in the current resolution model.
        var result = await _service.GetBusinessModulesAsync(_businessId);

        var customers = result.Modules.Single(m => m.Key == "customers");
        Assert.True(customers.IsCore);
        Assert.False(customers.HasAccess);
    }

    [Fact]
    public async Task Dependencies_AreParsedFromJson()
    {
        await SubscribeAsync("pro");

        var result = await _service.GetBusinessModulesAsync(_businessId);

        var appointments = result.Modules.Single(m => m.Key == "appointments");
        Assert.Equal(new List<string> { "customers", "staff" }, appointments.Dependencies);

        var customers = result.Modules.Single(m => m.Key == "customers");
        Assert.Empty(customers.Dependencies);
    }

    [Fact]
    public async Task InvalidDependenciesJson_DegradesToEmptyList()
    {
        var module = _db.Modules.Single(m => m.Key == "loyalty");
        module.DependenciesJson = "{not-valid-json";
        await _db.SaveChangesAsync();

        var result = await _service.GetBusinessModulesAsync(_businessId);

        var loyalty = result.Modules.Single(m => m.Key == "loyalty");
        Assert.Empty(loyalty.Dependencies);
    }

    [Fact]
    public async Task InactiveModules_AreExcludedFromEntitlements()
    {
        var module = _db.Modules.Single(m => m.Key == "programs");
        module.IsActive = false;
        await _db.SaveChangesAsync();
        await SubscribeAsync("enterprise");

        var result = await _service.GetBusinessModulesAsync(_businessId);

        Assert.DoesNotContain(result.Modules, m => m.Key == "programs");
    }

    [Fact]
    public async Task GetEffectiveModuleKeysAsync_MatchesHasAccessFlags()
    {
        await SubscribeAsync("starter");
        await AddOverrideAsync("appointments", isEnabled: true);

        var keys = await _service.GetEffectiveModuleKeysAsync(_businessId);

        Assert.Equal(new HashSet<string> { "customers", "staff", "settings", "appointments" }, keys);
    }

    [Fact]
    public async Task UnknownBusiness_ReturnsEmptyAccess()
    {
        var result = await _service.GetBusinessModulesAsync(Guid.NewGuid());

        Assert.Null(result.CurrentPlan);
        Assert.All(result.Modules, m => Assert.False(m.HasAccess));
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}