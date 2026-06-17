using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for RefreshToken entity.
/// </summary>
public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.UserAuthId)
            .IsRequired()
            .HasColumnName("user_auth_id");

        builder.Property(e => e.Token)
            .IsRequired()
            .HasMaxLength(500)
            .HasColumnName("token");

        builder.Property(e => e.ExpiresAt)
            .IsRequired()
            .HasColumnName("expires_at");

        builder.Property(e => e.IsRevoked)
            .HasDefaultValue(false)
            .HasColumnName("is_revoked");

        builder.Property(e => e.RevokedAt)
            .HasColumnName("revoked_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Indexes
        builder.HasIndex(e => e.Token).IsUnique();
        builder.HasIndex(e => e.UserAuthId);
        builder.HasIndex(e => e.ExpiresAt);

        // Relationship
        builder.HasOne(e => e.UserAuth)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(e => e.UserAuthId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
