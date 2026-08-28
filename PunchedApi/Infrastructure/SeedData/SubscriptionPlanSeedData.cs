using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.SeedData;

/// <summary>
/// Static definition of the platform's subscription plans. This is the
/// seed-time source of truth for the <c>subscription_plans</c> table.
/// Keys are lowercase and immutable once released.
/// </summary>
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