using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("notifications");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Channel).HasColumnName("channel").HasMaxLength(20);
        builder.Property(x => x.TemplateType).HasColumnName("template_type").HasMaxLength(100);
        builder.Property(x => x.Status).HasColumnName("status").HasMaxLength(20);
        builder.Property(x => x.SentAt).HasColumnName("sent_at");
        builder.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
        builder.Property(x => x.OpenedAt).HasColumnName("opened_at");
        builder.Property(x => x.Error).HasColumnName("error").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.SentAt });
        builder.HasIndex(x => new { x.BusinessId, x.TemplateType });
        builder.HasIndex(x => new { x.Status, x.SentAt });
    }
}
