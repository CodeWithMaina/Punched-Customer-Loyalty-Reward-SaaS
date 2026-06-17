using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStampAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "awarded_by_user_id",
                table: "stamps",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_stamps_awarded_by_user_id_stamped_at",
                table: "stamps",
                columns: new[] { "awarded_by_user_id", "stamped_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stamps_awarded_by_user_id_stamped_at",
                table: "stamps");

            migrationBuilder.DropColumn(
                name: "awarded_by_user_id",
                table: "stamps");
        }
    }
}
