using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for StampAdjustment entity (immutable audit log).
/// </summary>
public class StampAdjustmentConfiguration : IEntityTypeConfiguration<StampAdjustment>
{
    public void Configure(EntityTypeBuilder<StampAdjustment> builder)
    {
        builder.ToTable("stamp_adjustments");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CardId)
            .IsRequired()
            .HasColumnName("card_id");

        builder.Property(e => e.AdjustedByUserId)
            .HasColumnName("adjusted_by_user_id");

        builder.Property(e => e.AdjustedByRole)
            .IsRequired()
            .HasMaxLength(20)
            .HasColumnName("adjusted_by_role");

        builder.Property(e => e.Delta)
            .IsRequired()
            .HasColumnName("delta");

        builder.Property(e => e.Reason)
            .IsRequired()
            .HasColumnName("reason");

        builder.Property(e => e.Note)
            .HasMaxLength(500)
            .HasColumnName("note");

        builder.Property(e => e.RelatedStampId)
            .HasColumnName("related_stamp_id");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Delta must be non-zero: an adjustment that changes nothing is invalid.
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_stamp_adjustment_delta_nonzero", "\"delta\" <> 0");
        });

        builder.HasIndex(e => new { e.CardId, e.CreatedAt })
            .HasDatabaseName("IX_stamp_adjustments_CardId_CreatedAt");

        builder.HasOne(e => e.Card)
            .WithMany()
            .HasForeignKey(e => e.CardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.AdjustedByUser)
            .WithMany()
            .HasForeignKey(e => e.AdjustedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
