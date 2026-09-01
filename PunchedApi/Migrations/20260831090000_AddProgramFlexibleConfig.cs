using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Adds the flexible program configuration columns to <c>loyalty_programs</c>:
    /// description, lifecycle status, program type, JSON config, and a scheduled
    /// active window. Additive and backward compatible — existing rows are
    /// preserved; status is backfilled from the legacy <c>is_active</c> flag so
    /// active programs stay active and inactive ones become "paused".
    /// </summary>
    public partial class AddProgramFlexibleConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Status enum: Draft=0, Active=1, Paused=2, Archived=3.
            migrationBuilder.AddColumn<int>(
                name: "status",
                table: "loyalty_programs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Backfill: legacy active programs → Active; inactive ones → Paused.
            migrationBuilder.Sql("""
                UPDATE loyalty_programs
                    SET status = CASE WHEN is_active THEN 1 ELSE 2 END;
                """);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "loyalty_programs",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "program_type",
                table: "loyalty_programs",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "stamp");

            migrationBuilder.AddColumn<string>(
                name: "config_json",
                table: "loyalty_programs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "starts_at",
                table: "loyalty_programs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ends_at",
                table: "loyalty_programs",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "starts_at", table: "loyalty_programs");
            migrationBuilder.DropColumn(name: "ends_at", table: "loyalty_programs");
            migrationBuilder.DropColumn(name: "config_json", table: "loyalty_programs");
            migrationBuilder.DropColumn(name: "program_type", table: "loyalty_programs");
            migrationBuilder.DropColumn(name: "description", table: "loyalty_programs");
            migrationBuilder.DropColumn(name: "status", table: "loyalty_programs");
        }
    }
}