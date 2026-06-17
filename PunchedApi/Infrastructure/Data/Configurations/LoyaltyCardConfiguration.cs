using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for LoyaltyCard entity.
/// Unique constraint: one card per customer per business.
/// </summary>
public class LoyaltyCardConfiguration : IEntityTypeConfiguration<LoyaltyCard>
{
    public void Configure(EntityTypeBuilder<LoyaltyCard> builder)
    {
        builder.ToTable("loyalty_cards");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CustomerId)
            .IsRequired()
            .HasColumnName("customer_id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.ProgramId)
            .IsRequired()
            .HasColumnName("program_id");

        builder.Property(e => e.TotalStamps)
            .HasDefaultValue(0)
            .HasColumnName("total_stamps");

        builder.Property(e => e.LifetimeStamps)
            .HasDefaultValue(0)
            .HasColumnName("lifetime_stamps");

        builder.Property(e => e.TotalRedemptions)
            .HasDefaultValue(0)
            .HasColumnName("total_redemptions");

        builder.Property(e => e.LastStampAt)
            .HasColumnName("last_stamp_at");

        builder.Property(e => e.EnrolledAt)
            .HasColumnName("enrolled_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints (using ToTable API)
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_total_stamps_gte_zero", "\"total_stamps\" >= 0");
            t.HasCheckConstraint("chk_lifetime_stamps_gte_zero", "\"lifetime_stamps\" >= 0");
            t.HasCheckConstraint("chk_lifetime_gte_total", "\"lifetime_stamps\" >= \"total_stamps\"");
        });

        // Unique: one card per customer per business
        builder.HasIndex(e => new { e.CustomerId, e.BusinessId }).IsUnique();
        builder.HasIndex(e => new { e.BusinessId, e.LastStampAt });
        builder.HasIndex(e => new { e.BusinessId, e.EnrolledAt });
        builder.HasIndex(e => new { e.BusinessId, e.ProgramId });
        builder.HasIndex(e => e.CustomerId);

        // Relationships
        builder.HasOne(e => e.Customer)
            .WithMany(u => u.LoyaltyCards)
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Business)
            .WithMany(b => b.LoyaltyCards)
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Program)
            .WithMany(p => p.LoyaltyCards)
            .HasForeignKey(e => e.ProgramId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
