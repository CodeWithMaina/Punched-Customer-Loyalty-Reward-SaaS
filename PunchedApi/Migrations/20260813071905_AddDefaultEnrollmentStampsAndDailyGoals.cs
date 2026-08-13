using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultEnrollmentStampsAndDailyGoals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RewardExpirationHours",
                table: "loyalty_programs",
                newName: "reward_expiration_hours");

            migrationBuilder.AddColumn<int>(
                name: "daily_goal_override",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "qr_token_id",
                table: "stamps",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "source",
                table: "stamps",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "default_enrollment_stamps",
                table: "loyalty_programs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "default_daily_goal",
                table: "businesses",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "daily_goal_override",
                table: "users");

            migrationBuilder.DropColumn(
                name: "source",
                table: "stamps");

            migrationBuilder.DropColumn(
                name: "default_enrollment_stamps",
                table: "loyalty_programs");

            migrationBuilder.DropColumn(
                name: "default_daily_goal",
                table: "businesses");

            migrationBuilder.RenameColumn(
                name: "reward_expiration_hours",
                table: "loyalty_programs",
                newName: "RewardExpirationHours");

            migrationBuilder.AlterColumn<Guid>(
                name: "qr_token_id",
                table: "stamps",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
