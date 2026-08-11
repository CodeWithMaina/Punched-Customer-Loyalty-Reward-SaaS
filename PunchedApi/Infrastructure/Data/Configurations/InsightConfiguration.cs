using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class InsightConfiguration : IEntityTypeConfiguration<Insight>
{
    public void Configure(EntityTypeBuilder<Insight> builder)
    {
        builder.ToTable("insights");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Audience).HasColumnName("audience").HasMaxLength(20);
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Category).HasColumnName("category").HasMaxLength(80);
        builder.Property(x => x.Metric).HasColumnName("metric").HasMaxLength(80);
        builder.Property(x => x.Severity).HasColumnName("severity").HasMaxLength(10);
        builder.Property(x => x.Confidence).HasColumnName("confidence").HasMaxLength(10);
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(160);
        builder.Property(x => x.Message).HasColumnName("message").HasMaxLength(1000);
        builder.Property(x => x.Recommendation).HasColumnName("recommendation").HasMaxLength(1000);
        builder.Property(x => x.DataJson).HasColumnName("data_json").HasColumnType("jsonb");
        builder.Property(x => x.GeneratedAt).HasColumnName("generated_at");
        builder.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        builder.Property(x => x.Dismissed).HasColumnName("dismissed");
        builder.Property(x => x.DismissedAt).HasColumnName("dismissed_at");
        builder.Property(x => x.DismissedBy).HasColumnName("dismissed_by");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.DismissedBy)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.Audience, x.BusinessId, x.GeneratedAt });
        builder.HasIndex(x => new { x.BusinessId, x.Dismissed, x.Severity });
    }
}
