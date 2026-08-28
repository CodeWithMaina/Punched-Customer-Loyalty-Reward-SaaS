# Implementation Prompt: Phases 1-3 — Module Catalog & Entitlement Foundation

## Context

You are implementing the foundation of a plugin-based modular SaaS architecture for the Punched Customer Loyalty Reward platform. This follows the detailed architecture plan in `plugin-module-architecture-plan.md`.

**Goal of Phases 1-3:** Establish the database schema, seed data, and core entitlement service that will power module access control throughout the application.

**Key Principle:** Do not modify existing business logic. Add new tables and services that work alongside existing code.

---

## Phase 1: Database Schema & Entity Definitions

### Objective
Create the database tables and C# entities that will store module catalog, subscription plans, and business entitlements.

### Files to Create/Modify

#### 1.1 Create Entity Classes

**File:** `PunchedApi/Domain/Entities/Module.cs`
```csharp
namespace PunchedApi.Domain.Entities;

public class Module : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Version { get; set; } = "1.0.0";
    public bool IsCore { get; set; }
    public bool IsActive { get; set; } = true;
    public string? DependenciesJson { get; set; }
    
    public virtual ICollection<PlanModule> PlanModules { get; set; } = new List<PlanModule>();
    public virtual ICollection<BusinessModule> BusinessModules { get; set; } = new List<BusinessModule>();
}
```

**File:** `PunchedApi/Domain/Entities/SubscriptionPlan.cs`
```csharp
namespace PunchedApi.Domain.Entities;

public class SubscriptionPlan : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string BillingInterval { get; set; } = "monthly";
    public bool IsActive { get; set; } = true;
    
    public virtual ICollection<PlanModule> PlanModules { get; set; } = new List<PlanModule>();
    public virtual ICollection<BusinessSubscription> BusinessSubscriptions { get; set; } = new();
}
```

**File:** `PunchedApi/Domain/Entities/PlanModule.cs`
```csharp
namespace PunchedApi.Domain.Entities;

public class PlanModule
{
    public Guid PlanId { get; set; }
    public Guid ModuleId { get; set; }
    
    public virtual SubscriptionPlan Plan { get; set; } = null!;
    public virtual Module Module { get; set; } = null!;
}
```

**File:** `PunchedApi/Domain/Entities/BusinessSubscription.cs`
```csharp
namespace PunchedApi.Domain.Entities;

public class BusinessSubscription : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Guid PlanId { get; set; }
    public string Status { get; set; } = "active";
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public DateTime? CanceledAt { get; set; }
    
    public virtual Business Business { get; set; } = null!;
    public virtual SubscriptionPlan Plan { get; set; } = null!;
}
```

**File:** `PunchedApi/Domain/Entities/BusinessModule.cs`
```csharp
namespace PunchedApi.Domain.Entities;

public class BusinessModule : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Guid ModuleId { get; set; }
    public bool IsEnabled { get; set; } = true;
    public string Source { get; set; } = "PLAN";
    public DateTime? OverridesAt { get; set; }
    public Guid? OverriddenByUserId { get; set; }
    
    public virtual Business Business { get; set; } = null!;
    public virtual Module Module { get; set; } = null!;
    public virtual User? OverriddenByUser { get; set; }
}
```

#### 1.2 Modify Existing Business Entity

**File:** `PunchedApi/Domain/Entities/Business.cs`
- Add navigation properties:
```csharp
public virtual BusinessSubscription? CurrentSubscription { get; set; }
public virtual ICollection<BusinessModule> BusinessModules { get; set; } = new();
```

#### 1.3 Update DbContext

**File:** `PunchedApi/Infrastructure/Data/ApplicationDbContext.cs`
- Add DbSets:
```csharp
public DbSet<Module> Modules { get; set; }
public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
public DbSet<PlanModule> PlanModules { get; set; }
public DbSet<BusinessSubscription> BusinessSubscriptions { get; set; }
public DbSet<BusinessModule> BusinessModules { get; set; }
```

- Add model configuration in `OnModelCreating`:
```csharp
builder.Entity<Module>(entity =>
{
    entity.HasIndex(e => e.Key).IsUnique();
});

builder.Entity<SubscriptionPlan>(entity =>
{
    entity.HasIndex(e => e.Key).IsUnique();
});

builder.Entity<PlanModule>(entity =>
{
    entity.HasKey(e => new { e.PlanId, e.ModuleId });
    entity.HasOne(e => e.Plan).WithMany(p => p.PlanModules).HasForeignKey(e => e.PlanId);
    entity.HasOne(e => e.Module).WithMany(m => m.PlanModules).HasForeignKey(e => e.ModuleId);
});

builder.Entity<BusinessSubscription>(entity =>
{
    entity.HasIndex(e => e.BusinessId).IsUnique();
});

builder.Entity<BusinessModule>(entity =>
{
    entity.HasIndex(e => new { e.BusinessId, e.ModuleId }).IsUnique();
});
```

#### 1.4 Create Migration

Run: `dotnet ef migrations add AddModuleCatalogAndSubscriptionTables --context ApplicationDbContext`

---

## Phase 2: Seed Data & Module Catalog

### Objective
Populate the database with core modules and default subscription plans.

### Files to Create

#### 2.1 Module Seed Data

**File:** `PunchedApi/Infrastructure/SeedData/ModuleSeedData.cs`
```csharp
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.SeedData;

public static class ModuleSeedData
{
    public static List<Module> GetModules() => new()
    {
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), Key = "customers", Name = "Customers", Description = "Customer management", IsCore = true, IsActive = true },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), Key = "staff", Name = "Staff", Description = "Staff management", IsCore = true, IsActive = true },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), Key = "appointments", Name = "Appointments", Description = "Booking management", IsCore = false, IsActive = true, DependenciesJson = "[\"customers\",\"staff\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000004"), Key = "stamps", Name = "Stamps", Description = "Digital stamp cards", IsCore = false, IsActive = true, DependenciesJson = "[\"customers\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000005"), Key = "loyalty", Name = "Loyalty Programs", Description = "Loyalty program management", IsCore = false, IsActive = true, DependenciesJson = "[\"customers\",\"stamps\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000006"), Key = "rewards", Name = "Rewards", Description = "Reward catalog", IsCore = false, IsActive = true, DependenciesJson = "[\"loyalty\",\"stamps\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000007"), Key = "analytics", Name = "Analytics", Description = "Business analytics", IsCore = false, IsActive = true, DependenciesJson = "[\"customers\",\"stamps\",\"loyalty\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000008"), Key = "programs", Name = "Programs", Description = "Custom program builder", IsCore = false, IsActive = true, DependenciesJson = "[\"loyalty\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000009"), Key = "notifications", Name = "Notifications", Description = "Push notifications", IsCore = false, IsActive = true, DependenciesJson = "[\"customers\",\"staff\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000010"), Key = "settings", Name = "Settings", Description = "Business settings", IsCore = true, IsActive = true }
    };
}
```

#### 2.2 Subscription Plan Seed Data

**File:** `PunchedApi/Infrastructure/SeedData/SubscriptionPlanSeedData.cs`
```csharp
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.SeedData;

public static class SubscriptionPlanSeedData
{
    public static List<SubscriptionPlan> GetPlans() => new()
    {
        new SubscriptionPlan { Id = Guid.Parse("20000000-0000-0000-0000-000000000001"), Key = "starter", Name = "Starter", Description = "Essential features", Price = 0, BillingInterval = "monthly", IsActive = true },
        new SubscriptionPlan { Id = Guid.Parse("20000000-0000-0000-0000-000000000002"), Key = "growth", Name = "Growth", Description = "Advanced features", Price = 29.99m, BillingInterval = "monthly", IsActive = true },
        new SubscriptionPlan { Id = Guid.Parse("20000000-0000-0000-0000-000000000003"), Key = "pro", Name = "Pro", Description = "Full feature set", Price = 79.99m, BillingInterval = "monthly", IsActive = true },
        new SubscriptionPlan { Id = Guid.Parse("20000000-0000-0000-0000-000000000004"), Key = "enterprise", Name = "Enterprise", Description = "Custom configuration", Price = 199.99m, BillingInterval = "monthly", IsActive = true }
    };
}
```

#### 2.3 Plan-Module Assignments

**File:** `PunchedApi/Infrastructure/SeedData/PlanModuleSeedData.cs`
```csharp
namespace PunchedApi.Infrastructure.SeedData;

public static class PlanModuleSeedData
{
    public static List<(string PlanKey, string ModuleKey)> GetPlanModules() => new()
    {
        // Starter
        ("starter", "customers"), ("starter", "staff"), ("starter", "settings"),
        // Growth
        ("growth", "customers"), ("growth", "staff"), ("growth", "settings"),
        ("growth", "appointments"), ("growth", "stamps"), ("growth", "notifications"),
        // Pro
        ("pro", "customers"), ("pro", "staff"), ("pro", "settings"),
        ("pro", "appointments"), ("pro", "stamps"), ("pro", "notifications"),
        ("pro", "loyalty"), ("pro", "analytics"),
        // Enterprise
        ("enterprise", "customers"), ("enterprise", "staff"), ("enterprise", "settings"),
        ("enterprise", "appointments"), ("enterprise", "stamps"), ("enterprise", "notifications"),
        ("enterprise", "loyalty"), ("enterprise", "rewards"), ("enterprise", "analytics"), ("enterprise", "programs")
    };
}
```

#### 2.4 Seed Registration

**File:** `PunchedApi/Infrastructure/Data/ApplicationDbContextSeed.cs`
- Add method `SeedModuleCatalogAsync` and call it during startup.

---

## Phase 3: Core Entitlement Service

### Objective
Create the service that resolves effective module entitlements for a business.

### Files to Create

#### 3.1 Service Interface

**File:** `PunchedApi/Application/Services/IModuleEntitlementService.cs`
```csharp
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

public interface IModuleEntitlementService
{
    Task<ModuleEntitlementResult> GetBusinessModulesAsync(Guid businessId, Guid? userId = null);
    Task<bool> IsModuleEnabledAsync(Guid businessId, string moduleKey);
    Task<HashSet<string>> GetEffectiveModuleKeysAsync(Guid businessId);
}

public class ModuleEntitlementResult
{
    public List<ModuleEntitlement> Modules { get; set; } = new();
    public SubscriptionPlan? CurrentPlan { get; set; }
    public DateTime? SubscriptionEndsAt { get; set; }
}

public class ModuleEntitlement
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsEnabled { get; set; }
    public string Source { get; set; } = "PLAN";
    public List<string> Dependencies { get; set; } = new();
    public bool IsCore { get; set; }
    public bool HasAccess { get; set; }
}
```

#### 3.2 Service Implementation

**File:** `PunchedApi/Application/Services/ModuleEntitlementService.cs`
```csharp
using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

public class ModuleEntitlementService : IModuleEntitlementService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ModuleEntitlementService> _logger;

    public ModuleEntitlementService(ApplicationDbContext context, ILogger<ModuleEntitlementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ModuleEntitlementResult> GetBusinessModulesAsync(Guid businessId, Guid? userId = null)
    {
        var result = new ModuleEntitlementResult();
        
        var subscription = await _context.BusinessSubscriptions
            .Include(s => s.Plan).ThenInclude(p => p.PlanModules).ThenInclude(pm => pm.Module)
            .FirstOrDefaultAsync(s => s.BusinessId == businessId && s.Status == "active");
        
        result.CurrentPlan = subscription?.Plan;
        result.SubscriptionEndsAt = subscription?.EndsAt;
        
        var allModules = await _context.Modules.Where(m => m.IsActive).ToListAsync();
        var businessOverrides = await _context.BusinessModules.Where(bm => bm.BusinessId == businessId).ToListAsync();
        var planModuleIds = subscription?.Plan.PlanModules.Select(pm => pm.ModuleId).ToHashSet() ?? new();
        
        foreach (var module in allModules)
        {
            var entitlement = new ModuleEntitlement
            {
                Id = module.Id, Key = module.Key, Name = module.Name,
                Description = module.Description, IsCore = module.IsCore,
                Dependencies = ParseDependencies(module.DependenciesJson)
            };
            
            var overrideEntry = businessOverrides.FirstOrDefault(bm => bm.ModuleId == module.Id);
            if (overrideEntry != null)
            {
                entitlement.IsEnabled = overrideEntry.IsEnabled;
                entitlement.Source = overrideEntry.Source;
            }
            else
            {
                entitlement.IsEnabled = planModuleIds.Contains(module.Id);
                entitlement.Source = "PLAN";
            }
            
            var subscriptionActive = subscription != null && 
                (subscription.Status == "active" || subscription.Status == "trial") &&
                (!subscription.EndsAt.HasValue || subscription.EndsAt > DateTime.UtcNow);
            
            entitlement.HasAccess = entitlement.IsEnabled && subscriptionActive;
            result.Modules.Add(entitlement);
        }
        
        return result;
    }

    public async Task<bool> IsModuleEnabledAsync(Guid businessId, string moduleKey)
    {
        var entitlements = await GetBusinessModulesAsync(businessId);
        return entitlements.Modules.Any(m => m.Key == moduleKey && m.HasAccess);
    }

    public async Task<HashSet<string>> GetEffectiveModuleKeysAsync(Guid businessId)
    {
        var entitlements = await GetBusinessModulesAsync(businessId);
        return entitlements.Modules.Where(m => m.HasAccess).Select(m => m.Key).ToHashSet();
    }

    private static List<string> ParseDependencies(string? dependenciesJson)
    {
        if (string.IsNullOrEmpty(dependenciesJson)) return new();
        try { return System.Text.Json.JsonSerializer.Deserialize<List<string>>(dependenciesJson) ?? new(); }
        catch { return new(); }
    }
}
```

#### 3.3 Register Service in DI

**File:** `PunchedApi/Program.cs`
- Add registration: `builder.Services.AddScoped<IModuleEntitlementService, ModuleEntitlementService>();`

---

## Validation & Testing

1. **Run migrations:** `dotnet ef database update`
2. **Verify tables exist:** Modules, SubscriptionPlans, PlanModules, BusinessSubscriptions, BusinessModules
3. **Verify seed data** is present
4. **Create a test endpoint** to verify entitlement service works correctly
5. **Write unit tests** for entitlement resolution

---

## Important Notes

1. **Do not modify existing business logic** — only add new infrastructure
2. **All new tables use Guid primary keys** consistent with existing schema
3. **Module keys are lowercase** (e.g., "customers", not "Customers")
4. **Dependencies are stored as JSON** for flexibility

---

## Next Steps (After Phase 3)

- **Phase 4:** Create `GET /v1/me/modules` endpoint
- **Phase 5:** Implement `ModuleEntitlementGuard` middleware
- **Phase 6:** Build frontend module registry and dynamic navigation

---

*This prompt follows the implementation plan in `plugin-module-architecture-plan.md`.*