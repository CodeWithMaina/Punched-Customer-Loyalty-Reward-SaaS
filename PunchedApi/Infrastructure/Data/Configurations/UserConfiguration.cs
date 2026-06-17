using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for User entity.
/// Defines the 1:1 relationship with UserAuth via email.
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.Email)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("email");

        builder.Property(e => e.PhoneNumber)
            .HasMaxLength(20)
            .HasColumnName("phone_number");

        builder.Property(e => e.FullName)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("full_name");

        builder.Property(e => e.AvatarUrl)
            .HasMaxLength(500)
            .HasColumnName("avatar_url");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Indexes
        builder.HasIndex(e => e.Email).IsUnique();
        builder.HasIndex(e => new { e.FullName, e.Email });
        builder.HasIndex(e => e.StaffBusinessId);

        // 1:1 with UserAuth via email
        builder.HasOne(e => e.Auth)
            .WithOne(a => a.Profile)
            .HasForeignKey<User>(e => e.Email)
            .HasPrincipalKey<UserAuth>(a => a.Email)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
