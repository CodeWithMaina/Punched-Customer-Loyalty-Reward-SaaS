using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class StaffShiftConfiguration : IEntityTypeConfiguration<StaffShift>
{
    public void Configure(EntityTypeBuilder<StaffShift> builder)
    {
        builder.ToTable("staff_shifts");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.StaffUserId).HasColumnName("staff_user_id");
        builder.Property(x => x.BusinessId).HasColumnName("business_id");
        builder.Property(x => x.Date).HasColumnName("date");
        builder.Property(x => x.StartHour).HasColumnName("start_hour");
        builder.Property(x => x.EndHour).HasColumnName("end_hour");
        builder.Property(x => x.IsWorking).HasColumnName("is_working");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("chk_staff_shift_start_hour", "\"start_hour\" >= 0 AND \"start_hour\" <= 23");
            t.HasCheckConstraint("chk_staff_shift_end_hour", "\"end_hour\" >= 0 AND \"end_hour\" <= 23");
        });

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.StaffUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(x => x.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.StaffUserId, x.Date });
        builder.HasIndex(x => new { x.BusinessId, x.Date });
    }
}
