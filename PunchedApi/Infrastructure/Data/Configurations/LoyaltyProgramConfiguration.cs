using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

/// <summary>
/// Fluent API configuration for LoyaltyProgram entity.
/// A business may have multiple loyalty programs.
/// </summary>
public class LoyaltyProgramConfiguration : IEntityTypeConfiguration<LoyaltyProgram>
{
    public void Configure(EntityTypeBuilder<LoyaltyProgram> builder)
    {
        builder.ToTable("loyalty_programs");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.BusinessId)
            .IsRequired()
            .HasColumnName("business_id");

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(100)
            .HasColumnName("name")
            .HasDefaultValue("Loyalty Program");

        builder.Property(e => e.IsActive)
            .IsRequired()
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.Property(e => e.StampsRequired)
            .IsRequired()
            .HasColumnName("stamps_required");

        builder.Property(e => e.RewardValue)
            .HasPrecision(10, 2)
            .HasColumnName("reward_value");

        builder.Property(e => e.RewardDescription)
            .IsRequired()
            .HasMaxLength(200)
            .HasColumnName("reward_description");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at");

        // Check constraints
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_stamps_required_positive", "\"stamps_required\" > 0");
            t.HasCheckConstraint("chk_program_reward_value_positive", "\"reward_value\" > 0");
        });

        // Index on business_id (non-unique: many programs per business)
        builder.HasIndex(e => e.BusinessId);

        // Relationship: one business -> many programs
        builder.HasOne(e => e.Business)
            .WithMany(b => b.LoyaltyPrograms)
            .HasForeignKey(e => e.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
