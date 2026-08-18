using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class AppointmentResourceConfiguration : IEntityTypeConfiguration<AppointmentResource>
{
    public void Configure(EntityTypeBuilder<AppointmentResource> builder)
    {
        builder.ToTable("appointment_resources");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.AppointmentId).HasColumnName("appointment_id");
        builder.Property(x => x.ServiceCatalogItemId).HasColumnName("service_catalog_item_id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120);
        builder.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
        builder.Property(x => x.Price).HasColumnName("price").HasPrecision(10, 2);
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(x => x.AppointmentId);
        builder.HasIndex(x => x.ServiceCatalogItemId);

        builder.HasOne<Appointment>()
            .WithMany(a => a.Resources)
            .HasForeignKey(x => x.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}