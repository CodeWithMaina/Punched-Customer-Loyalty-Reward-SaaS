using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class StaffDailyAnalyticsConfiguration : IEntityTypeConfiguration<StaffDailyAnalytics>
{
    public void Configure(EntityTypeBuilder<StaffDailyAnalytics> builder)
    {
        builder.ToTable("staff_daily_analytics");

        builder.HasKey(x => new { x.StaffUserId, x.BusinessId, x.Date });

        builder.Property(x => x.StaffUserId).HasColumnName("staff_user_id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Date).HasColumnName("date");
        builder.Property(x => x.Stamps).HasColumnName("stamps");
        builder.Property(x => x.DistinctCustomers).HasColumnName("distinct_customers");
        builder.Property(x => x.NewCustomers).HasColumnName("new_customers");
        builder.Property(x => x.RewardReadyCreated).HasColumnName("reward_ready_created");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.StaffUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.StaffUserId, x.Date });
        builder.HasIndex(x => new { x.BusinessId, x.Date });
    }
}
