using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class BusinessDailyAnalyticsConfiguration : IEntityTypeConfiguration<BusinessDailyAnalytics>
{
    public void Configure(EntityTypeBuilder<BusinessDailyAnalytics> builder)
    {
        builder.ToTable("business_daily_analytics");

        builder.HasKey(x => new { x.BusinessId, x.Date });

        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Date).HasColumnName("date");
        builder.Property(x => x.Stamps).HasColumnName("stamps");
        builder.Property(x => x.DistinctCustomers).HasColumnName("distinct_customers");
        builder.Property(x => x.NewEnrollments).HasColumnName("new_enrollments");
        builder.Property(x => x.Redemptions).HasColumnName("redemptions");
        builder.Property(x => x.PayoutKes).HasColumnName("payout_kes").HasPrecision(12, 2);
        builder.Property(x => x.AccruedLiabilityKes).HasColumnName("accrued_liability_kes").HasPrecision(12, 2);
        builder.Property(x => x.RewardReadyCustomers).HasColumnName("reward_ready_customers");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.BusinessId, x.Date });
        builder.HasIndex(x => new { x.BusinessId, x.Date }).IsDescending(false, true);
    }
}
