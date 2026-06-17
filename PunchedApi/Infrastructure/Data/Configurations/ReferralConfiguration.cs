using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class ReferralConfiguration : IEntityTypeConfiguration<Referral>
{
    public void Configure(EntityTypeBuilder<Referral> builder)
    {
        builder.ToTable("referrals");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.ReferralLinkId)
            .IsRequired()
            .HasColumnName("referral_link_id");

        builder.Property(e => e.ReferrerId)
            .IsRequired()
            .HasColumnName("referrer_id");

        builder.Property(e => e.RefereeId)
            .IsRequired()
            .HasColumnName("referee_id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasColumnName("status");

        builder.Property(e => e.ActivatedAt)
            .HasColumnName("activated_at");

        builder.Property(e => e.QualifiedAt)
            .HasColumnName("qualified_at");

        builder.Property(e => e.RewardedAt)
            .HasColumnName("rewarded_at");

        builder.Property(e => e.ExpiresAt)
            .IsRequired()
            .HasColumnName("expires_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // First-referral-wins: one active referral per referee per business
        builder.HasIndex(e => new { e.RefereeId, e.BusinessId })
            .IsUnique()
            .HasFilter("\"status\" NOT IN ('Expired')");

        // Lookup indexes
        builder.HasIndex(e => e.ReferrerId);
        builder.HasIndex(e => e.RefereeId);
        builder.HasIndex(e => new { e.BusinessId, e.Status });
        builder.HasIndex(e => e.ExpiresAt);

        // Relationships
        builder.HasOne(e => e.ReferralLink)
            .WithMany(rl => rl.Referrals)
            .HasForeignKey(e => e.ReferralLinkId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Referrer)
            .WithMany()
            .HasForeignKey(e => e.ReferrerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Referee)
            .WithMany()
            .HasForeignKey(e => e.RefereeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Business)
            .WithMany()
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
