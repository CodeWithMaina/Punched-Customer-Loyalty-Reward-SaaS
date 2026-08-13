using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notification_inbox");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Type).HasColumnName("type").HasMaxLength(50);
        builder.Property(x => x.StampsCount).HasColumnName("stamps_count");
        builder.Property(x => x.IsRead).HasColumnName("is_read");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.IsRead });
        builder.HasIndex(x => new { x.UserId, x.CreatedAt });
    }
}