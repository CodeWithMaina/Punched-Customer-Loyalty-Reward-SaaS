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

        builder.Property(e => e.PerformedByUserId)
            .HasColumnName("user_id");

        builder.Property(e => e.PerformedByRole)
            .HasMaxLength(20)
            .HasColumnName("performed_by_role");

        builder.Property(e => e.RewardValue)
            .HasPrecision(10, 2)
            .HasColumnName("reward_value");

        builder.Property(e => e.Status)
            .IsRequired()
            .HasColumnName("status")
            .HasDefaultValue(RedemptionStatus.Pending);

        builder.Property(e => e.FulfilledByUserId)
            .HasColumnName("fulfilled_by_user_id");

        builder.Property(e => e.FulfilledAt)
            .HasColumnName("fulfilled_at");

        builder.Property(e => e.FulfilmentCodeHash)
            .HasMaxLength(255)
            .HasColumnName("fulfilment_code_hash");

        builder.Property(e => e.PayoutStatus)
            .HasMaxLength(20)
            .HasColumnName("payout_status");

        builder.Property(e => e.FailedAttempts)
            .HasColumnName("failed_attempts")
            .HasDefaultValue(0);

        builder.Property(e => e.CodeLocked)
            .HasColumnName("code_locked")
            .HasDefaultValue(false);

        builder.Property(e => e.StampsConsumed)
            .HasColumnName("stamps_consumed")
            .HasDefaultValue(0);

        builder.Property(e => e.MpesaRef)
            .HasMaxLength(100)
            .HasColumnName("mpesa_ref");

        builder.Property(e => e.RedeemedAt)
            .HasColumnName("redeemed_at");

        builder.Property(e => e.PaidAt)
            .HasColumnName("paid_at");

        builder.Property(e => e.ProcessingStartedAt)
            .HasColumnName("processing_started_at");

        builder.Property(e => e.RetryCount)
            .HasColumnName("retry_count")
            .HasDefaultValue(0);

        builder.Property(e => e.NextRetryAt)
            .HasColumnName("next_retry_at");

        builder.Property(e => e.ProcessingWorkerId)
            .HasColumnName("processing_worker_id")
            .HasMaxLength(100);

        builder.Property(e => e.FailureReason)
            .HasColumnName("failure_reason")
            .HasMaxLength(500);

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints (using ToTable API)
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_redemption_reward_value_positive", "\"reward_value\" > 0");
            t.HasCheckConstraint("chk_redemption_status_valid", "\"status\" IN (0, 1, 2)");
        });

        // Indexes
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.PerformedByUserId)
            .HasDatabaseName("IX_redemptions_UserId");
        builder.HasIndex(e => new { e.CardId, e.RedeemedAt });
        builder.HasIndex(e => new { e.BusinessId, e.RedeemedAt });
        builder.HasIndex(e => new { e.BusinessId, e.PerformedByUserId, e.RedeemedAt });
        builder.HasIndex(e => new { e.PayoutStatus, e.NextRetryAt });
        builder.HasIndex(e => new { e.CardId, e.Status })
            .HasDatabaseName("IX_redemptions_CardId_Status");
        builder.HasIndex(e => e.FulfilledByUserId)
            .HasDatabaseName("IX_redemptions_FulfilledByUserId");

        // Relationships
        builder.HasOne(e => e.Card)
            .WithMany(c => c.Redemptions)
            .HasForeignKey(e => e.CardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Business)
            .WithMany(b => b.Redemptions)
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.PerformedByUser)
            .WithMany(u => u.Redemptions)
            .HasForeignKey(e => e.PerformedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.FulfilledByUser)
            .WithMany()
            .HasForeignKey(e => e.FulfilledByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
