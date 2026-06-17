using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for UserAuth entity.
/// Defines indexes, constraints, and defaults.
/// </summary>
public class UserAuthConfiguration : IEntityTypeConfiguration<UserAuth>
{
    public void Configure(EntityTypeBuilder<UserAuth> builder)
    {
        builder.ToTable("user_auth");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.Email)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("email");

        builder.Property(e => e.PasswordHash)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("password_hash");

        builder.Property(e => e.IsVerified)
            .HasDefaultValue(false)
            .HasColumnName("is_verified");

        builder.Property(e => e.FailedLoginAttempts)
            .HasDefaultValue((short)0)
            .HasColumnName("failed_login_attempts");

        builder.Property(e => e.LockedUntil)
            .HasColumnName("locked_until");

        builder.Property(e => e.LastLoginAt)
            .HasColumnName("last_login_at");

        builder.Property(e => e.VerificationCode)
            .HasMaxLength(255)
            .HasColumnName("verification_code");

        builder.Property(e => e.VerificationCodeExpiresAt)
            .HasColumnName("verification_code_expires_at");

        builder.Property(e => e.VerificationCodeAttempts)
            .HasDefaultValue((short)0)
            .HasColumnName("verification_code_attempts");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Indexes
        builder.HasIndex(e => e.Email).IsUnique();
        builder.HasIndex(e => e.CreatedAt);
    }
}
