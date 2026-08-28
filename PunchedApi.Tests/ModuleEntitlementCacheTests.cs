using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// Phase 8 hardening: per-business entitlement caching and invalidation.
/// Uses a dedicated IMemoryCache to verify hit/miss/Invalidate semantics.
/// </summary>
public class ModuleEntitlementCacheTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly MemoryCache _cache;
    private readonly ModuleEntitlementService _service;
    private readonly Guid _businessId = Guid.NewGuid();

    public ModuleEntitlementCacheTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ApplicationDbContext(options);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _service = new ModuleEntitlementService(
            _db, NullLogger<ModuleEntitlementService>.Instance, _cache);

        _db.Modules.AddRange(ModuleSeedData.GetModules());
        _db.SubscriptionPlans.AddRange(SubscriptionPlanSeedData.GetPlans());
        _db.SaveChanges();

        var modules = _db.Modules.ToDictionary(m => m.Key);
        var proPlan = _db.SubscriptionPlans.Single(p => p.Key == "pro");
        foreach (var core in modules.Values.Where(m => m.IsCore))
        {
            _db.PlanModules.Add(new PlanModule { PlanId = proPlan.Id, ModuleId = core.Id });
        }
        _db.SaveChanges();

        _db.Businesses.Add(new Business
        {
            Id = _businessId,
            Name = "Cache Test Biz",
            Category = "salon",
            Location = "Nairobi",
            MpesaNumber = "123456"
        });
        _db.SaveChanges();
    }

    private async Task SubscribeProAsync()
    {
        var proPlan = _db.SubscriptionPlans.Single(p => p.Key == "pro");
        _db.BusinessSubscriptions.Add(new BusinessSubscription
        {
            BusinessId = _businessId,
            PlanId = proPlan.Id,
            Status = "active"
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task SecondRead_IsServedFromCache()
    {
        await SubscribeProAsync();

        var first = await _service.GetBusinessModulesAsync(_businessId);
        Assert.True(_cache.TryGetValue(
            ModuleEntitlementService.CacheKey(_businessId), out _));

        // Mutate the DB directly (bypassing invalidation) — the cached result
        // must still reflect the pre-mutation state.
        _db.BusinessSubscriptions.Remove(_db.BusinessSubscriptions.First());
        await _db.SaveChangesAsync();

        var second = await _service.GetBusinessModulesAsync(_businessId);
        Assert.Same(first, second);
        Assert.NotNull(second.CurrentPlan);
    }

    [Fact]
    public async Task Invalidate_ForcesFreshResolution()
    {
        await SubscribeProAsync();

        var cached = await _service.GetBusinessModulesAsync(_businessId);
        Assert.NotNull(cached.CurrentPlan);

        // Mutate, then invalidate — next read must reflect the DB.
        _db.BusinessSubscriptions.Remove(_db.BusinessSubscriptions.First());
        await _db.SaveChangesAsync();
        _service.Invalidate(_businessId);

        var fresh = await _service.GetBusinessModulesAsync(_businessId);
        Assert.NotSame(cached, fresh);
        Assert.Null(fresh.CurrentPlan);
        Assert.All(fresh.Modules, m => Assert.False(m.HasAccess));
    }

    [Fact]
    public async Task Invalidate_UnknownBusiness_IsNoOp()
    {
        _service.Invalidate(Guid.NewGuid()); // must not throw
        var result = await _service.GetBusinessModulesAsync(_businessId);
        Assert.NotNull(result);
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        _cache.Dispose();
    }
}
