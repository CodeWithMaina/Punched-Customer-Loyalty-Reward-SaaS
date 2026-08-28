using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="Module"/> entity to the snake_case <c>modules</c> table.
/// Explicit configuration keeps the EF model in sync with the model snapshot —
/// without it EF drifts to PascalCase defaults and generates destructive
/// rename operations on every migration.
/// </summary>
public class ModuleConfiguration : IEntityTypeConfiguration<Module>
{
    public void Configure(EntityTypeBuilder<Module> builder)
    {
        builder.ToTable("modules");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Key).HasColumnName("key").HasMaxLength(50);
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(100);
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(x => x.Version).HasColumnName("version").HasMaxLength(20).HasDefaultValue("1.0.0");
        builder.Property(x => x.IsCore).HasColumnName("is_core");
        builder.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(x => x.DependenciesJson).HasColumnName("dependencies_json");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(x => x.Key)
            .IsUnique()
            .HasDatabaseName("ix_modules_key");
    }
}