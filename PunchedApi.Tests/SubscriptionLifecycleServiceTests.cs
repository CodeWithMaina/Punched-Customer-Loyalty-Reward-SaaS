using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// Unit tests for the subscription lifecycle (Step 7.2/7.3): plan changes,
/// expiry, renewal, cancellation — plus the entitlement-cache invalidation
/// contract that every mutation must honour.
/// </summary>
public class SubscriptionLifecycleServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly ModuleEntitlementService _entitlements;
    private readonly SubscriptionLifecycleService _service;
    private readonly SubscriptionExpiryService _expiryService;
    private readonly Guid _businessId = Guid.NewGuid();

    public SubscriptionLifecycleServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _db = new ApplicationDbContext(options);
        _entitlements = new ModuleEntitlementService(_db, TestHelpers.CreateLogger<ModuleEntitlementService>());
        _service = new SubscriptionLifecycleService(_db, _entitlements, TestHelpers.CreateLogger<SubscriptionLifecycleService>());
        _expiryService = new SubscriptionExpiryService(_db, _entitlements, TestHelpers.CreateLogger<SubscriptionExpiryService>());

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
            Id = _businessId,
            Name = "Test Salon",
            Category = "salon",
            Location = "Nairobi",
            MpesaNumber = "123456"
        });
        _db.SaveChanges();
    }

    private BusinessSubscription AddSubscription(string planKey, string status = "active", DateTime? endsAt = null)
    {
        var plan = _db.SubscriptionPlans.Single(p => p.Key == planKey);
        var sub = new BusinessSubscription
        {
            BusinessId = _businessId,
            PlanId = plan.Id,
            Status = status,
            StartsAt = DateTime.UtcNow.AddDays(-30),
            EndsAt = endsAt
        };
        _db.BusinessSubscriptions.Add(sub);
        _db.SaveChanges();
        return sub;
    }

    private async Task<HashSet<string>> EffectiveKeysAsync() =>
        await _entitlements.GetEffectiveModuleKeysAsync(_businessId);

    [Fact]
    public async Task ChangePlanAsync_UpsertsRowToActive()
    {
        var starter = AddSubscription("starter");
        var growth = _db.SubscriptionPlans.Single(p => p.Key == "growth");

        var sub = await _service.ChangePlanAsync(_businessId, growth.Id, actorUserId: Guid.NewGuid(), reason: "upgrade");

        Assert.Equal("active", sub.Status);
        Assert.Equal(growth.Id, sub.PlanId);
        Assert.NotNull(sub.StartsAt);
        Assert.NotNull(sub.EndsAt); // monthly plan → EndsAt derived
        Assert.Null(sub.CanceledAt);

        var row = await _db.BusinessSubscriptions.SingleAsync(s => s.Id == starter.Id);
        Assert.Equal("active", row.Status);
        Assert.Equal(growth.Id, row.PlanId);
    }

    [Fact]
    public async Task ChangePlanAsync_AtMostOneActiveSubscription()
    {
        AddSubscription("starter");
        var pro = _db.SubscriptionPlans.Single(p => p.Key == "pro");
        await _service.ChangePlanAsync(_businessId, pro.Id, null);
        await _service.ChangePlanAsync(_businessId, pro.Id, null); // second change

        var rows = _db.BusinessSubscriptions.Where(s => s.BusinessId == _businessId).ToList();
        Assert.Single(rows); // schema: one row per business
        Assert.Equal("active", rows[0].Status);
    }

    [Fact]
    public async Task ChangePlanAsync_UnknownPlan_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.ChangePlanAsync(_businessId, Guid.NewGuid(), null));
    }

    [Fact]
    public async Task ChangePlanAsync_InvalidateObservable()
    {
        // Before: no subscription → no module access.
        Assert.Empty(await EffectiveKeysAsync());

        var growth = _db.SubscriptionPlans.Single(p => p.Key == "growth");
        await _service.ChangePlanAsync(_businessId, growth.Id, null);

        // After: same service instance reflects the mutation (cache invalidated).
        var keys = await EffectiveKeysAsync();
        Assert.Contains("customers", keys);
        Assert.Contains("appointments", keys); // growth plan bundle
    }

    [Fact]
    public async Task ExpireAsync_FlipsActiveToExpired()
    {
        AddSubscription("starter", endsAt: DateTime.UtcNow.AddDays(30));

        var count = await _service.ExpireAsync(_businessId);

        Assert.Equal(1, count);
        var row = _db.BusinessSubscriptions.Single(s => s.BusinessId == _businessId);
        Assert.Equal("expired", row.Status);
        Assert.NotNull(row.EndsAt);
    }

    [Fact]
    public async Task ExpireAsync_FlipsTrialToExpired_InvalidateObservable()
    {
        AddSubscription("growth", status: "trial");
        Assert.Contains("appointments", await EffectiveKeysAsync());

        await _service.ExpireAsync(_businessId);

        var row = _db.BusinessSubscriptions.Single(s => s.BusinessId == _businessId);
        Assert.Equal("expired", row.Status);
        Assert.Empty(await EffectiveKeysAsync());
    }

    [Fact]
    public async Task RenewAsync_ReactivatesExpired()
    {
        AddSubscription("starter", status: "expired", endsAt: DateTime.UtcNow.AddDays(-5));

        var count = await _service.RenewAsync(_businessId);

        Assert.Equal(1, count);
        var row = _db.BusinessSubscriptions.Single(s => s.BusinessId == _businessId);
        Assert.Equal("active", row.Status);
        Assert.Null(row.CanceledAt);
        Assert.NotNull(row.EndsAt);
        Assert.Contains("customers", await EffectiveKeysAsync());
    }

    [Fact]
    public async Task CancelAsync_FlipsToCanceled_AndInvalidate()
    {
        AddSubscription("growth");

        var count = await _service.CancelAsync(_businessId, "owner request");

        Assert.Equal(1, count);
        var row = _db.BusinessSubscriptions.Single(s => s.BusinessId == _businessId);
        Assert.Equal("canceled", row.Status);
        Assert.NotNull(row.CanceledAt);
        Assert.DoesNotContain("appointments", await EffectiveKeysAsync());
    }

    [Fact]
    public async Task ExpireOverdueAsync_OnlyExpiresOverdueRows()
    {
        var asOf = DateTime.UtcNow;

        var overdueBiz = Guid.NewGuid();
        var pastDueBiz = Guid.NewGuid();
        var futureBiz = Guid.NewGuid();
        var infiniteBiz = Guid.NewGuid();
        foreach (var id in new[] { overdueBiz, pastDueBiz, futureBiz, infiniteBiz })
        {
            _db.Businesses.Add(new Business
            {
                Id = id, Name = $"B-{id:N}"[..10], Category = "salon", Location = "Nairobi", MpesaNumber = "1"
            });
        }
        await _db.SaveChangesAsync();

        AddFor(overdueBiz, "starter", endsAt: asOf.AddDays(-1));        // overdue → expired
        AddFor(pastDueBiz, "growth", status: "past_due", endsAt: asOf.AddHours(-2)); // overdue → expired
        AddFor(futureBiz, "starter", endsAt: asOf.AddDays(10));         // future → stays
        AddFor(infiniteBiz, "starter", endsAt: null);                   // infinite → stays

        var businesses = await _expiryService.ExpireOverdueAsync(asOf);

        Assert.Equal(2, businesses);
        Assert.Equal("expired", _db.BusinessSubscriptions.Single(s => s.BusinessId == overdueBiz).Status);
        Assert.Equal("expired", _db.BusinessSubscriptions.Single(s => s.BusinessId == pastDueBiz).Status);
        Assert.Equal("active", _db.BusinessSubscriptions.Single(s => s.BusinessId == futureBiz).Status);
        Assert.Equal("active", _db.BusinessSubscriptions.Single(s => s.BusinessId == infiniteBiz).Status);
    }

    private Guid AddFor(Guid businessId, string planKey, string status = "active", DateTime? endsAt = null)
    {
        var plan = _db.SubscriptionPlans.Single(p => p.Key == planKey);
        var sub = new BusinessSubscription
        {
            BusinessId = businessId, PlanId = plan.Id, Status = status, StartsAt = DateTime.UtcNow, EndsAt = endsAt
        };
        _db.BusinessSubscriptions.Add(sub);
        _db.SaveChanges();
        return sub.Id;
    }

    [Fact]
    public async Task ExpireOverdueAsync_NoOverdue_ReturnsZero()
    {
        AddSubscription("starter", endsAt: DateTime.UtcNow.AddDays(30));

        var businesses = await _expiryService.ExpireOverdueAsync(DateTime.UtcNow);

        Assert.Equal(0, businesses);
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}
