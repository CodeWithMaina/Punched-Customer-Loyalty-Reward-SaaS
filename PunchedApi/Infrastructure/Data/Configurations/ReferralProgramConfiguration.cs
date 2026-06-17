using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class ReferralProgramConfiguration : IEntityTypeConfiguration<ReferralProgram>
{
    public void Configure(EntityTypeBuilder<ReferralProgram> builder)
    {
        builder.ToTable("referral_programs");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.ReferralsRequired)
            .HasDefaultValue(1)
            .HasColumnName("referrals_required");

        builder.Property(e => e.RewardType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasColumnName("reward_type");

        builder.Property(e => e.RewardValue)
            .IsRequired()
            .HasColumnName("reward_value");

        builder.Property(e => e.RewardDescription)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("reward_description");

        builder.Property(e => e.IsActive)
            .HasDefaultValue(true)
            .HasColumnName("is_active");

        builder.Property(e => e.ExpirationDays)
            .HasDefaultValue(30)
            .HasColumnName("expiration_days");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_referrals_required_gte_one", "\"referrals_required\" >= 1");
            t.HasCheckConstraint("chk_referral_reward_value_gte_zero", "\"reward_value\" >= 0");
            t.HasCheckConstraint("chk_expiration_days_gte_one", "\"expiration_days\" >= 1");
        });

        // One referral program per business
        builder.HasIndex(e => e.BusinessId).IsUnique();

        // Relationship
        builder.HasOne(e => e.Business)
            .WithOne(b => b.ReferralProgram)
            .HasForeignKey<ReferralProgram>(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
