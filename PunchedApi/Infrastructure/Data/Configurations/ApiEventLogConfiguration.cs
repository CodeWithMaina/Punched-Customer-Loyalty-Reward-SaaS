using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class ApiEventLogConfiguration : IEntityTypeConfiguration<ApiEventLog>
{
    public void Configure(EntityTypeBuilder<ApiEventLog> builder)
    {
        builder.ToTable("api_event_logs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TenantId).HasColumnName("tenant_id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Endpoint).HasColumnName("endpoint").HasMaxLength(300);
        builder.Property(x => x.Method).HasColumnName("method").HasMaxLength(10);
        builder.Property(x => x.StatusCode).HasColumnName("status_code");
        builder.Property(x => x.DurationMs).HasColumnName("duration_ms");
        builder.Property(x => x.ErrorCode).HasColumnName("error_code").HasMaxLength(100);
        builder.Property(x => x.DetailsJson).HasColumnName("details_json");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.TenantId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.CreatedAt).IsDescending();
        builder.HasIndex(x => new { x.TenantId, x.CreatedAt });
        builder.HasIndex(x => x.StatusCode);
    }
}
