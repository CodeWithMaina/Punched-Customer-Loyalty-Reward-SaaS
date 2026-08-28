using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="BusinessSubscription"/> entity to the snake_case
/// <c>business_subscriptions</c> table. One subscription per business —
/// enforced by a unique index on <c>business_id</c> wired to the
/// <see cref="Business.CurrentSubscription"/> 1:1 navigation.
/// </summary>
public class BusinessSubscriptionConfiguration : IEntityTypeConfiguration<BusinessSubscription>
{
    public void Configure(EntityTypeBuilder<BusinessSubscription> builder)
    {
        builder.ToTable("business_subscriptions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("active");
        builder.Property(x => x.StartsAt).HasColumnName("starts_at");
        builder.Property(x => x.EndsAt).HasColumnName("ends_at");
        builder.Property(x => x.CanceledAt).HasColumnName("canceled_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne(x => x.Business)
            .WithOne(b => b.CurrentSubscription)
            .HasForeignKey<BusinessSubscription>(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Plan)
            .WithMany(p => p.BusinessSubscriptions)
            .HasForeignKey(x => x.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.BusinessId)
            .IsUnique()
            .HasDatabaseName("ix_business_subscriptions_business_id");

        builder.HasIndex(x => x.PlanId)
            .HasDatabaseName("ix_business_subscriptions_plan_id");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("ix_business_subscriptions_status");
    }
}