using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class CustomerSegmentConfiguration : IEntityTypeConfiguration<CustomerSegment>
{
    public void Configure(EntityTypeBuilder<CustomerSegment> builder)
    {
        builder.ToTable("customer_segments");

        builder.HasKey(x => new { x.BusinessId, x.CustomerId });

        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.CustomerId).HasColumnName("customer_id");
        builder.Property(x => x.Segment).HasColumnName("segment").HasMaxLength(30);
        builder.Property(x => x.Score).HasColumnName("score");
        builder.Property(x => x.ComputedAt).HasColumnName("computed_at");
        builder.Property(x => x.LastStampAt).HasColumnName("last_stamp_at");

        builder.ToTable(t => t.HasCheckConstraint("chk_customer_segment_score", "\"score\" >= 0 AND \"score\" <= 100"));

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.BusinessId, x.Segment });
        builder.HasIndex(x => new { x.BusinessId, x.CustomerId });
    }
}
