using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="BusinessModule"/> entity to the snake_case
/// <c>business_modules</c> table. A unique composite index on
/// (business_id, module_id) guarantees one override row per business/module.
/// </summary>
public class BusinessModuleConfiguration : IEntityTypeConfiguration<BusinessModule>
{
    public void Configure(EntityTypeBuilder<BusinessModule> builder)
    {
        builder.ToTable("business_modules");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.ModuleId).HasColumnName("module_id");
        builder.Property(x => x.IsEnabled).HasColumnName("is_enabled").HasDefaultValue(true);
        builder.Property(x => x.Source).HasColumnName("source").HasMaxLength(20).HasDefaultValue("PLAN");
        builder.Property(x => x.OverridesAt).HasColumnName("overrides_at");
        builder.Property(x => x.OverriddenByUserId).HasColumnName("overridden_by_user_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne(x => x.Business)
            .WithMany(b => b.BusinessModules)
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Module)
            .WithMany(m => m.BusinessModules)
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OverriddenByUser)
            .WithMany()
            .HasForeignKey(x => x.OverriddenByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.BusinessId, x.ModuleId })
            .IsUnique()
            .HasDatabaseName("ix_business_modules_business_module");

        builder.HasIndex(x => x.ModuleId)
            .HasDatabaseName("ix_business_modules_module_id");
    }
}