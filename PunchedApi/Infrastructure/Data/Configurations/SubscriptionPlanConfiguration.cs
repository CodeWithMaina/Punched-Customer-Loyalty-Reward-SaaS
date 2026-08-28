using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="SubscriptionPlan"/> entity to the snake_case
/// <c>subscription_plans</c> table.
/// </summary>
public class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> builder)
    {
        builder.ToTable("subscription_plans");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Key).HasColumnName("key").HasMaxLength(50);
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(100);
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(x => x.Price).HasColumnName("price").HasPrecision(12, 2);
        builder.Property(x => x.BillingInterval).HasColumnName("billing_interval").HasMaxLength(20).HasDefaultValue("monthly");
        builder.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(x => x.Key)
            .IsUnique()
            .HasDatabaseName("ix_subscription_plans_key");
    }
}