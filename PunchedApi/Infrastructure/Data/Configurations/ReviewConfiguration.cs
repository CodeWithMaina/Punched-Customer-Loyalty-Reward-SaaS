using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.CustomerId).HasColumnName("customer_id");
        builder.Property(x => x.StaffUserId).HasColumnName("staff_user_id");
        builder.Property(x => x.Rating).HasColumnName("rating");
        builder.Property(x => x.Comment).HasColumnName("comment").HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.ToTable(t => t.HasCheckConstraint("chk_review_rating", "\"rating\" >= 1 AND \"rating\" <= 5"));

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.StaffUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.BusinessId, x.CreatedAt });
        builder.HasIndex(x => new { x.StaffUserId, x.CreatedAt });
    }
}
