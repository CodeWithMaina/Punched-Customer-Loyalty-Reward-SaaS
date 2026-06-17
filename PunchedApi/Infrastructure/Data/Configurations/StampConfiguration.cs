using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for Stamp entity.
/// Immutable audit log — one stamp per QR token (unique constraint).
/// </summary>
public class StampConfiguration : IEntityTypeConfiguration<Stamp>
{
    public void Configure(EntityTypeBuilder<Stamp> builder)
    {
        builder.ToTable("stamps");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CardId)
            .IsRequired()
            .HasColumnName("card_id");

        builder.Property(e => e.StampNumber)
            .IsRequired()
            .HasColumnName("stamp_number");

        builder.Property(e => e.StampedAt)
            .IsRequired()
            .HasColumnName("stamped_at");

        builder.Property(e => e.QrTokenId)
            .IsRequired()
            .HasColumnName("qr_token_id");

        builder.Property(e => e.AwardedByUserId)
            .HasColumnName("awarded_by_user_id");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints (using ToTable API)
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_stamp_number_positive", "\"stamp_number\" > 0");
        });

        // One stamp per QR token
        builder.HasIndex(e => e.QrTokenId).IsUnique();
        builder.HasIndex(e => e.CardId);
        builder.HasIndex(e => new { e.CardId, e.StampedAt });
        builder.HasIndex(e => new { e.AwardedByUserId, e.StampedAt });

        // Relationships
        builder.HasOne(e => e.Card)
            .WithMany(c => c.Stamps)
            .HasForeignKey(e => e.CardId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
