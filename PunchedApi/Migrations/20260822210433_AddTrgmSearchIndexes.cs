using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTrgmSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // pg_trgm + GIN indexes accelerate case-insensitive substring search
            // (ILIKE '%term%') on the hottest business/staff/customer search columns.
            // Neon PostgreSQL supports the pg_trgm extension.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_businesses_name_trgm ON businesses USING gin (name gin_trgm_ops);");
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_businesses_location_trgm ON businesses USING gin (location gin_trgm_ops);");
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_businesses_category_trgm ON businesses USING gin (category gin_trgm_ops);");
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);");
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_users_email_trgm ON users USING gin (email gin_trgm_ops);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_users_email_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_users_full_name_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_businesses_category_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_businesses_location_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_businesses_name_trgm;");
            // The pg_trgm extension itself is intentionally left installed.
        }
    }
}
