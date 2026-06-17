using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for QrToken entity.
/// Unique token hash, indexes for expiry cleanup and lookup.
/// </summary>
public class QrTokenConfiguration : IEntityTypeConfiguration<QrToken>
{
    public void Configure(EntityTypeBuilder<QrToken> builder)
    {
        builder.ToTable("qr_tokens");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.CustomerId)
            .IsRequired()
            .HasColumnName("customer_id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.TokenHash)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("token_hash");

        builder.Property(e => e.ExpiresAt)
            .IsRequired()
            .HasColumnName("expires_at");

        builder.Property(e => e.IsUsed)
            .HasDefaultValue(false)
            .HasColumnName("is_used");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Indexes
        builder.HasIndex(e => e.TokenHash).IsUnique();
        builder.HasIndex(e => e.ExpiresAt);
        builder.HasIndex(e => new { e.CustomerId, e.BusinessId });
    }
}
