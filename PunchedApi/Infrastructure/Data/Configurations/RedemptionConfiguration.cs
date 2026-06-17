using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for Redemption entity.
/// Status flows: pending → processing → completed | failed.
/// </summary>
public class RedemptionConfiguration : IEntityTypeConfiguration<Redemption>
{
    public void Configure(EntityTypeBuilder<Redemption> builder)
    {
        builder.ToTable("redemptions");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CardId)
            .IsRequired()
            .HasColumnName("card_id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.RewardValue)
            .HasPrecision(10, 2)
            .HasColumnName("reward_value");

        builder.Property(e => e.Status)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("pending")
            .HasColumnName("status");

        builder.Property(e => e.MpesaRef)
            .HasMaxLength(100)
            .HasColumnName("mpesa_ref");

        builder.Property(e => e.RedeemedAt)
            .HasColumnName("redeemed_at");

        builder.Property(e => e.PaidAt)
            .HasColumnName("paid_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints (using ToTable API)
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_redemption_reward_value_positive", "\"reward_value\" > 0");
        });

        // Indexes
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => new { e.CardId, e.RedeemedAt });
        builder.HasIndex(e => new { e.BusinessId, e.RedeemedAt });

        // Relationships
        builder.HasOne(e => e.Card)
            .WithMany(c => c.Redemptions)
            .HasForeignKey(e => e.CardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Business)
            .WithMany(b => b.Redemptions)
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
