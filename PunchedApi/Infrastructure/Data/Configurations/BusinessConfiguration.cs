using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for Business entity.
/// </summary>
public class BusinessConfiguration : IEntityTypeConfiguration<Business>
{
    public void Configure(EntityTypeBuilder<Business> builder)
    {
        builder.ToTable("businesses");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("name");

        builder.Property(e => e.Category)
            .IsRequired()
            .HasMaxLength(50)
            .HasColumnName("category");

        builder.Property(e => e.Location)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("location");

        builder.Property(e => e.PhoneNumber)
            .HasMaxLength(20)
            .HasColumnName("phone_number");

        builder.Property(e => e.Email)
            .HasMaxLength(255)
            .HasColumnName("email");

        builder.Property(e => e.Description)
            .HasMaxLength(500)
            .HasColumnName("description");

        builder.Property(e => e.LogoUrl)
            .HasMaxLength(500)
            .HasColumnName("logo_url");

        builder.Property(e => e.MpesaNumber)
            .IsRequired()
            .HasMaxLength(20)
            .HasColumnName("mpesa_number");

        builder.Property(e => e.OwnerId)
            .HasColumnName("owner_id");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Indexes
        builder.HasIndex(e => new { e.Name, e.Location });
        builder.HasIndex(e => e.Category);
        builder.HasIndex(e => e.OwnerId);

        // Owner relationship (optional)
        builder.HasOne(e => e.Owner)
            .WithMany()
            .HasForeignKey(e => e.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
