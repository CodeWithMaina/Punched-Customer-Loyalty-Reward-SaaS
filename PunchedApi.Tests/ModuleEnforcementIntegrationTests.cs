using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PunchedApi.API.Controllers;
using PunchedApi.API.Filters;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.Modules;
using PunchedApi.Application.Services;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.SeedData;

namespace PunchedApi.Tests;

/// <summary>
/// Step 5 toggle-on enforcement matrix (G3). Exercises the REAL BusinessContext
/// + RequireModuleAttribute pipeline with Modules:EnforcementEnabled=true —
/// the unit route, since no WebApplicationFactory dependency exists in this
/// project (none was added per prompt constraints). Every scenario mirrors the
/// documented entitlement semantics: plan → overrides → subscription gate →
/// dependency closure → role handling → fail-open toggle.
/// </summary>
public class ModuleEnforcementIntegrationTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly ModuleEntitlementService _entitlements;
    private readonly string _dbName = Guid.NewGuid().ToString();

    public ModuleEnforcementIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(_dbName)
            .Options;
        _db = new ApplicationDbContext(options);
        _entitlements = new ModuleEntitlementService(_db, TestHelpers.CreateLogger<ModuleEntitlementService>());

        _db.Modules.AddRange(ModuleSeedData.GetModules());
        _db.SubscriptionPlans.AddRange(SubscriptionPlanSeedData.GetPlans());
        _db.SaveChanges();

        var modules = _db.Modules.ToDictionary(m => m.Key);
        var plans = _db.SubscriptionPlans.ToDictionary(p => p.Key);
        foreach (var (planKey, moduleKey) in PlanModuleSeedData.GetPlanModules())
            _db.PlanModules.Add(new PlanModule { PlanId = plans[planKey].Id, ModuleId = modules[moduleKey].Id });
        _db.SaveChanges();
    }

    // ── Fixture helpers ─────────────────────────────────────────

    private async Task<Business> CreateBusinessAsync(string name)
    {
        var business = new Business
        {
            Id = Guid.NewGuid(), Name = name, Category = "salon",
            Location = "Nairobi", MpesaNumber = "123456"
        };
        _db.Businesses.Add(business);
        await _db.SaveChangesAsync();
        return business;
    }

    private async Task SubscribeAsync(Guid businessId, string planKey, string status = "active", DateTime? endsAt = null)
    {
        var plan = _db.SubscriptionPlans.Single(p => p.Key == planKey);
        _db.BusinessSubscriptions.Add(new BusinessSubscription
        {
            BusinessId = businessId, PlanId = plan.Id, Status = status,
            StartsAt = DateTime.UtcNow.AddDays(-30), EndsAt = endsAt
        });
        await _db.SaveChangesAsync();
    }

    private async Task AddOverrideAsync(Guid businessId, string moduleKey, bool isEnabled, string source = "ADMIN")
    {
        var module = _db.Modules.Single(m => m.Key == moduleKey);
        _db.BusinessModules.Add(new BusinessModule
        {
            BusinessId = businessId, ModuleId = module.Id, IsEnabled = isEnabled,
            Source = source, OverridesAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    private BusinessContext CreateContext(
        string role, Guid? userId, Guid? ownedBusinessId,
        bool enforcementEnabled = true)
    {
        var claims = new List<Claim>();
        if (role != null) claims.Add(new Claim(ClaimTypes.Role, role));
        if (userId != null) claims.Add(new Claim("userId", userId.Value.ToString()));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));

        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        // Each BusinessContext gets its own DbContext + service instance so
        // tests stay isolated (the per-business IMemoryCache inside the
        // service would otherwise share resolved state between scenarios).
        var resolver = new StubScopeResolver(ownedBusinessId);
        return new BusinessContext(
            resolver,
            new ModuleEntitlementService(_db, TestHelpers.CreateLogger<ModuleEntitlementService>()),
            CreateDb(),
            Options.Create(new ModuleEnforcementOptions { EnforcementEnabled = enforcementEnabled }),
            accessor);
    }

    private ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(_dbName)
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class StubScopeResolver : IBusinessScopeResolver
    {
        private readonly Guid? _businessId;
        public StubScopeResolver(Guid? businessId) => _businessId = businessId;
        public Task<Guid?> GetOwnedBusinessIdAsync(Guid ownerId) => Task.FromResult(_businessId);
        public void InvalidateOwner(Guid ownerId) { }
    }

    // ── The matrix ──────────────────────────────────────────────

    [Fact]
    public async Task EnterpriseBusiness_HasEveryCatalogModule()
    {
        var business = await CreateBusinessAsync("Ent Biz");
        await SubscribeAsync(business.Id, "enterprise");

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        foreach (var module in ModuleCatalog.Modules)
            Assert.True(await ctx.HasModuleAsync(module.Key),
                $"enterprise business should have access to '{module.Key}'");
    }

    [Fact]
    public async Task StarterBusiness_LacksAnalytics()
    {
        var business = await CreateBusinessAsync("Starter Biz");
        await SubscribeAsync(business.Id, "starter");

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        Assert.False(await ctx.HasModuleAsync("analytics"));
        Assert.True(await ctx.HasModuleAsync("customers"));
    }

    [Fact]
    public async Task ExpiredSubscription_RemovesNonCoreAccess()
    {
        var business = await CreateBusinessAsync("Expired Biz");
        await SubscribeAsync(business.Id, "pro", endsAt: DateTime.UtcNow.AddDays(-1));

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        var entitlements = await _entitlements.GetBusinessModulesAsync(business.Id);
        Assert.All(entitlements.Modules.Where(m => !m.IsCore), m => Assert.False(m.HasAccess));
        Assert.False(await ctx.HasModuleAsync("analytics"));
    }

    [Fact]
    public async Task OverrideBeatsPlan_DisabledOverrideDeniesPlanGrant()
    {
        var business = await CreateBusinessAsync("Override Biz");
        await SubscribeAsync(business.Id, "pro"); // plan grants analytics
        await AddOverrideAsync(business.Id, "analytics", isEnabled: false);

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        Assert.False(await ctx.HasModuleAsync("analytics"));
    }

    [Fact]
    public async Task AdminOverride_GrantsModuleOutsidePlan()
    {
        var business = await CreateBusinessAsync("Admin Grant Biz");
        await SubscribeAsync(business.Id, "starter"); // no rewards in starter
        await AddOverrideAsync(business.Id, "rewards", isEnabled: true, source: "ADMIN");

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        Assert.True(await ctx.HasModuleAsync("rewards"));
    }

    [Fact]
    public async Task DependencyClosure_MakesDepsAccessible_ButAbsentFromExplicitList()
    {
        var business = await CreateBusinessAsync("Closure Biz");
        await SubscribeAsync(business.Id, "starter");
        await AddOverrideAsync(business.Id, "rewards", isEnabled: true); // deps: loyalty, stamps

        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id);

        // Closure: deps accessible through access checks.
        Assert.True(await ctx.HasModuleAsync("loyalty"));
        Assert.True(await ctx.HasModuleAsync("stamps"));

        // …but NOT present in the explicit entitlement/nav list.
        var explicitKeys = await _entitlements.GetEffectiveModuleKeysAsync(business.Id);
        Assert.DoesNotContain("loyalty", explicitKeys);
        Assert.DoesNotContain("stamps", explicitKeys);
    }

    [Fact]
    public async Task CrossTenantIsolation_OverridesDoNotLeakBetweenBusinesses()
    {
        var bizA = await CreateBusinessAsync("Biz A");
        var bizB = await CreateBusinessAsync("Biz B");
        await SubscribeAsync(bizA.Id, "pro");
        await SubscribeAsync(bizB.Id, "pro");
        await AddOverrideAsync(bizA.Id, "analytics", isEnabled: false);

        var ctxA = CreateContext("Business", Guid.NewGuid(), bizA.Id);
        var ctxB = CreateContext("Business", Guid.NewGuid(), bizB.Id);

        Assert.False(await ctxA.HasModuleAsync("analytics"));
        Assert.True(await ctxB.HasModuleAsync("analytics"));
    }

    [Fact]
    public async Task Admin_BypassesModuleChecks_ForAnyKey()
    {
        var ctx = CreateContext("Admin", Guid.NewGuid(), ownedBusinessId: null);

        foreach (var module in ModuleCatalog.Modules)
            Assert.True(await ctx.HasModuleAsync(module.Key));
    }

    [Fact]
    public async Task Customer_GetsOnlyCustomerFacingModules_ReadSide()
    {
        var ctx = CreateContext("Customer", Guid.NewGuid(), ownedBusinessId: null);

        foreach (var module in ModuleCatalog.Modules)
        {
            var expected = module.RequiredRoles.Contains("Customer", StringComparer.OrdinalIgnoreCase);
            Assert.Equal(expected, await ctx.HasModuleAsync(module.Key));
        }
    }

    [Fact]
    public async Task ToggleOff_FailsOpen_EvenWithoutSubscription()
    {
        var business = await CreateBusinessAsync("No Sub Biz"); // no subscription at all
        var ctx = CreateContext("Business", Guid.NewGuid(), business.Id, enforcementEnabled: false);

        Assert.True(await ctx.HasModuleAsync("analytics"));
        Assert.True(await ctx.HasModuleAsync("rewards"));
    }

    [Fact]
    public async Task UnentitledEndpointCall_Returns403ModuleDisabled_ThroughTheFilter()
    {
        var business = await CreateBusinessAsync("Filter Biz");
        await SubscribeAsync(business.Id, "starter"); // no analytics

        var entitledCtx = CreateContext("Business", Guid.NewGuid(), business.Id);
        var filterCtx = CreateFilterContext(entitledCtx);

        var attribute = new RequireModuleAttribute("analytics");
        await attribute.OnAuthorizationAsync(filterCtx);

        var result = Assert.IsType<ObjectResult>(filterCtx.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.False(root.GetProperty("success").GetBoolean());
        Assert.Equal("MODULE_DISABLED", root.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task EntitledEndpointCall_PassesThroughTheFilter()
    {
        var business = await CreateBusinessAsync("Filter Biz Pro");
        await SubscribeAsync(business.Id, "pro");

        var entitledCtx = CreateContext("Business", Guid.NewGuid(), business.Id);
        var filterCtx = CreateFilterContext(entitledCtx);

        var attribute = new RequireModuleAttribute("analytics");
        await attribute.OnAuthorizationAsync(filterCtx);

        Assert.Null(filterCtx.Result);
    }

    private static AuthorizationFilterContext CreateFilterContext(IBusinessContext businessContext)
    {
        var services = new ServiceCollection();
        services.AddSingleton(businessContext);
        var httpContext = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider()
        };

        var actionContext = new ActionContext(
            httpContext, new RouteData(),
            new ActionDescriptor(), new ModelStateDictionary());

        return new AuthorizationFilterContext(actionContext, new List<IFilterMetadata>());
    }

    // ── ValidateConfiguration (G7) ──────────────────────────────

    [Fact]
    public void ValidateConfiguration_MissingDependency_IsReported()
    {
        var problems = _entitlements.ValidateConfiguration(new[]
        {
            ("analytics", true),
            ("loyalty", true),
            ("stamps", true),
            ("customers", false), // analytics depends on customers — not enabled
        });

        Assert.Contains(problems, p => p.Contains("'analytics'") && p.Contains("'customers'"));
    }

    [Fact]
    public void ValidateConfiguration_DependenciesSatisfied_ReturnsEmpty()
    {
        var problems = _entitlements.ValidateConfiguration(new[]
        {
            ("analytics", true),
            ("customers", true),
            ("loyalty", true),
            ("stamps", true),
        });

        Assert.Empty(problems);
    }

    [Fact]
    public void ValidateConfiguration_DisabledModules_NeverProduceProblems()
    {
        var problems = _entitlements.ValidateConfiguration(new[]
        {
            ("analytics", false),
            ("rewards", false),
            ("referral", false),
        });

        Assert.Empty(problems);
    }

    [Fact]
    public async Task AdminOverride_ForceBypassesDependencyValidation()
    {
        var business = await CreateBusinessAsync("Force Biz");
        await SubscribeAsync(business.Id, "starter");

        var controller = CreateAdminController();
        var forced = await controller.SetBusinessModuleOverride(business.Id, "analytics",
            new PunchedApi.Application.DTOs.AdminSetModuleOverrideRequest
            { Enabled = true, Force = true, Reason = "test force" });
        Assert.IsType<OkObjectResult>(forced);

        var business2 = await CreateBusinessAsync("NoForce Biz");
        await SubscribeAsync(business2.Id, "starter");

        var rejected = await controller.SetBusinessModuleOverride(business2.Id, "analytics",
            new PunchedApi.Application.DTOs.AdminSetModuleOverrideRequest { Enabled = true });

        var badRequest = Assert.IsType<BadRequestObjectResult>(rejected);
        var body = Assert.IsAssignableFrom<PunchedApi.Application.DTOs.ApiResponse<PunchedApi.Application.DTOs.MessageResponse>>(badRequest.Value);
        Assert.Equal("DEPENDENCY_MISSING", body.Error?.Code);
    }

    private AdminModulesController CreateAdminController()
    {
        var controller = new AdminModulesController(
            _entitlements, _db, TestHelpers.CreateLogger<AdminModulesController>());

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("userId", Guid.NewGuid().ToString()),
        }, "test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}
