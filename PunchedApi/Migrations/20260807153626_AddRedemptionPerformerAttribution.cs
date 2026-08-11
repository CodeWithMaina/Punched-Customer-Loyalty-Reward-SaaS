using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRedemptionPerformerAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_redemptions_users_UserId",
                table: "redemptions");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "redemptions",
                newName: "user_id");

            migrationBuilder.AddColumn<string>(
                name: "performed_by_role",
                table: "redemptions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_StaffBusinessId",
                table: "users",
                column: "StaffBusinessId");

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_business_id_user_id_redeemed_at",
                table: "redemptions",
                columns: new[] { "business_id", "user_id", "redeemed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_business_id_enrolled_at",
                table: "loyalty_cards",
                columns: new[] { "business_id", "enrolled_at" });

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_business_id_program_id",
                table: "loyalty_cards",
                columns: new[] { "business_id", "program_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_redemptions_users_user_id",
                table: "redemptions",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_redemptions_users_user_id",
                table: "redemptions");

            migrationBuilder.DropIndex(
                name: "IX_users_StaffBusinessId",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_redemptions_business_id_user_id_redeemed_at",
                table: "redemptions");

            migrationBuilder.DropIndex(
                name: "IX_loyalty_cards_business_id_enrolled_at",
                table: "loyalty_cards");

            migrationBuilder.DropIndex(
                name: "IX_loyalty_cards_business_id_program_id",
                table: "loyalty_cards");

            migrationBuilder.DropColumn(
                name: "performed_by_role",
                table: "redemptions");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "redemptions",
                newName: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_redemptions_users_UserId",
                table: "redemptions",
                column: "UserId",
                principalTable: "users",
                principalColumn: "id");
        }
    }
}
