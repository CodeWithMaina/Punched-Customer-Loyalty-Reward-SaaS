using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddNoStaffOverlapExclusion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // btree_gist provides the equality operator class for uuid, which the
            // exclusion constraint's GiST index requires.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            // Database-level guarantee against double booking: two active
            // appointments for the same staff member cannot overlap in time.
            // Rows with NULL staff_user_id (no-staff bookings) never conflict,
            // because exclusion constraints treat NULLs as distinct.
            migrationBuilder.Sql(
                """
                ALTER TABLE appointments
                ADD CONSTRAINT appointments_no_staff_overlap
                EXCLUDE USING gist (
                    staff_user_id WITH =,
                    tstzrange(scheduled_at, end_at) WITH &&
                )
                WHERE (status <> 'cancelled');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_staff_overlap;");
        }
    }
}
