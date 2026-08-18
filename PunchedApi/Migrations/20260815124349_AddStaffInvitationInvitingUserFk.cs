using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffInvitationInvitingUserFk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_staff_invitations_inviting_user_id",
                table: "staff_invitations",
                column: "inviting_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_staff_invitations_users_inviting_user_id",
                table: "staff_invitations",
                column: "inviting_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_staff_invitations_users_inviting_user_id",
                table: "staff_invitations");

            migrationBuilder.DropIndex(
                name: "IX_staff_invitations_inviting_user_id",
                table: "staff_invitations");
        }
    }
}
