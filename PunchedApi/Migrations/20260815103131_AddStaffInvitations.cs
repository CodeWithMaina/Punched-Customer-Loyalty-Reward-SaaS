using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "staff_invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    inviting_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resend_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_staff_invitations_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_staff_invitations_business_email_pending",
                table: "staff_invitations",
                columns: new[] { "business_id", "invited_email" },
                unique: true,
                filter: "\"status\" = 0");

            migrationBuilder.CreateIndex(
                name: "ix_staff_invitations_business_id",
                table: "staff_invitations",
                column: "business_id");

            migrationBuilder.CreateIndex(
                name: "ix_staff_invitations_token_hash",
                table: "staff_invitations",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "staff_invitations");
        }
    }
}
