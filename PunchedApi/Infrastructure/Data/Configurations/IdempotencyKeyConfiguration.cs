using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for IdempotencyKey entity.
/// Unique per (key) — the client generates globally-unique keys.
/// Index on ExpiresAt supports cleanup of stale entries.
/// </summary>
public class IdempotencyKeyConfiguration : IEntityTypeConfiguration<IdempotencyKey>
{
    public void Configure(EntityTypeBuilder<IdempotencyKey> builder)
    {
        builder.ToTable("idempotency_keys");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.Key)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("key");

        builder.Property(e => e.UserId)
            .IsRequired()
            .HasColumnName("user_id");

        builder.Property(e => e.RequestHash)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("request_hash");

        builder.Property(e => e.ResponseJson)
            .IsRequired()
            .HasColumnName("response_json");

        builder.Property(e => e.ExpiresAt)
            .IsRequired()
            .HasColumnName("expires_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        builder.HasIndex(e => e.Key).IsUnique();
        builder.HasIndex(e => e.ExpiresAt)
            .HasDatabaseName("IX_idempotency_keys_ExpiresAt");

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
