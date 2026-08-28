using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Maps the <see cref="PlanModule"/> join entity to the snake_case
/// <c>plan_modules</c> table with a composite primary key.
/// </summary>
public class PlanModuleConfiguration : IEntityTypeConfiguration<PlanModule>
{
    public void Configure(EntityTypeBuilder<PlanModule> builder)
    {
        builder.ToTable("plan_modules");

        builder.HasKey(x => new { x.PlanId, x.ModuleId });
        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.ModuleId).HasColumnName("module_id");

        builder.HasOne(x => x.Plan)
            .WithMany(p => p.PlanModules)
            .HasForeignKey(x => x.PlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Module)
            .WithMany(m => m.PlanModules)
            .HasForeignKey(x => x.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.ModuleId)
            .HasDatabaseName("ix_plan_modules_module_id");
    }
}