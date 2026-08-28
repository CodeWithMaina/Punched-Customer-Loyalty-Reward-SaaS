using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.SeedData;

/// <summary>
/// Static definition of the platform's module catalog. This is the seed-time
/// source of truth for the <c>modules</c> table and must stay in sync with
/// the runtime <c>ModuleCatalog</c> (Phase 4+).
/// Keys are lowercase and immutable once released.
/// </summary>
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
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000010"), Key = "settings", Name = "Settings", Description = "Business settings", IsCore = true, IsActive = true },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000011"), Key = "referral", Name = "Referrals", Description = "Customer referral program", IsCore = false, IsActive = true, DependenciesJson = "[\"loyalty\",\"stamps\"]" },
        new Module { Id = Guid.Parse("10000000-0000-0000-0000-000000000012"), Key = "serviceCatalog", Name = "Service Catalog", Description = "Bookable services the business offers", IsCore = false, IsActive = true }
    };
}