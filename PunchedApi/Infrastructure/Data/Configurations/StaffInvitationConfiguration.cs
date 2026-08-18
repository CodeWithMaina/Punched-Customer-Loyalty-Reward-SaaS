using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="StaffInvitation"/> entity to the existing snake_case
/// <c>staff_invitations</c> schema created by the AddStaffInvitations migrations.
/// This configuration is required to keep the EF model in sync with the model
/// snapshot — without it EF drifts to PascalCase defaults and generates
/// destructive rename operations on every migration.
/// </summary>
public class StaffInvitationConfiguration : IEntityTypeConfiguration<StaffInvitation>
{
    public void Configure(EntityTypeBuilder<StaffInvitation> builder)
    {
        builder.ToTable("staff_invitations");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.InvitedEmail).HasColumnName("invited_email").HasMaxLength(255);
        builder.Property(x => x.InvitingUserId).HasColumnName("inviting_user_id");
        builder.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(64);
        builder.Property(x => x.Status).HasColumnName("status").HasDefaultValue(InvitationStatus.Pending);
        builder.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        builder.Property(x => x.AcceptedAt).HasColumnName("accepted_at");
        builder.Property(x => x.RevokedAt).HasColumnName("revoked_at");
        builder.Property(x => x.ResendCount).HasColumnName("resend_count").HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne(x => x.Business)
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.InvitingUser)
            .WithMany()
            .HasForeignKey(x => x.InvitingUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.BusinessId)
            .HasDatabaseName("ix_staff_invitations_business_id");
        builder.HasIndex(x => x.InvitingUserId);
        builder.HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("ix_staff_invitations_token_hash");
        builder.HasIndex(x => new { x.BusinessId, x.InvitedEmail })
            .IsUnique()
            .HasDatabaseName("ix_staff_invitations_business_email_pending")
            .HasFilter("\"status\" = 0");
    }
}