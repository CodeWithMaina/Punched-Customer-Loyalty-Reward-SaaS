using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class ReferralLinkConfiguration : IEntityTypeConfiguration<ReferralLink>
{
    public void Configure(EntityTypeBuilder<ReferralLink> builder)
    {
        builder.ToTable("referral_links");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.ReferrerId)
            .IsRequired()
            .HasColumnName("referrer_id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.Code)
            .IsRequired()
            .HasMaxLength(12)
            .HasColumnName("code");

        builder.Property(e => e.SuccessfulReferrals)
            .HasDefaultValue(0)
            .HasColumnName("successful_referrals");

        builder.Property(e => e.IsActive)
            .HasDefaultValue(true)
            .HasColumnName("is_active");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_successful_referrals_gte_zero", "\"successful_referrals\" >= 0");
        });

        // Unique code globally
        builder.HasIndex(e => e.Code).IsUnique();

        // One link per referrer per business
        builder.HasIndex(e => new { e.ReferrerId, e.BusinessId }).IsUnique();

        // Lookup by referrer
        builder.HasIndex(e => e.ReferrerId);

        // Relationships
        builder.HasOne(e => e.Referrer)
            .WithMany()
            .HasForeignKey(e => e.ReferrerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Business)
            .WithMany()
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
