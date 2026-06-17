using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddLoyaltyProgramNameAndMultiplePrograms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_loyalty_programs_business_id",
                table: "loyalty_programs");

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "loyalty_programs",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "loyalty_programs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Loyalty Program");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_programs_business_id",
                table: "loyalty_programs",
                column: "business_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_loyalty_programs_business_id",
                table: "loyalty_programs");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "loyalty_programs");

            migrationBuilder.DropColumn(
                name: "name",
                table: "loyalty_programs");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_programs_business_id",
                table: "loyalty_programs",
                column: "business_id",
                unique: true);
        }
    }
}
