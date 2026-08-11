using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class LoyaltyProgramHistoryConfiguration : IEntityTypeConfiguration<LoyaltyProgramHistory>
{
    public void Configure(EntityTypeBuilder<LoyaltyProgramHistory> builder)
    {
        builder.ToTable("loyalty_program_history");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.LoyaltyProgramId).HasColumnName("loyalty_program_id");
        builder.Property(x => x.StampsRequired).HasColumnName("stamps_required");
        builder.Property(x => x.RewardValue).HasColumnName("reward_value").HasPrecision(10, 2);
        builder.Property(x => x.RewardDescription).HasColumnName("reward_description").HasMaxLength(200);
        builder.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
        builder.Property(x => x.EffectiveTo).HasColumnName("effective_to");
        builder.Property(x => x.ChangedByUserId).HasColumnName("changed_by_user_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne<LoyaltyProgram>()
            .WithMany()
            .HasForeignKey(x => x.LoyaltyProgramId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.LoyaltyProgramId, x.EffectiveFrom });
    }
}
