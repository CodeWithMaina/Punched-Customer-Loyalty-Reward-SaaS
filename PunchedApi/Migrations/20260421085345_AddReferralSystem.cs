using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "referral_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    referrer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    successful_referrals = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_referral_links", x => x.id);
                    table.CheckConstraint("chk_successful_referrals_gte_zero", "\"successful_referrals\" >= 0");
                    table.ForeignKey(
                        name: "FK_referral_links_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_referral_links_users_referrer_id",
                        column: x => x.referrer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "referral_programs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    referrals_required = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    reward_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reward_value = table.Column<decimal>(type: "numeric", nullable: false),
                    reward_description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    expiration_days = table.Column<int>(type: "integer", nullable: false, defaultValue: 30),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_referral_programs", x => x.id);
                    table.CheckConstraint("chk_expiration_days_gte_one", "\"expiration_days\" >= 1");
                    table.CheckConstraint("chk_referral_reward_value_gte_zero", "\"reward_value\" >= 0");
                    table.CheckConstraint("chk_referrals_required_gte_one", "\"referrals_required\" >= 1");
                    table.ForeignKey(
                        name: "FK_referral_programs_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "referrals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    referral_link_id = table.Column<Guid>(type: "uuid", nullable: false),
                    referrer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    referee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    activated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    qualified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rewarded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_referrals", x => x.id);
                    table.ForeignKey(
                        name: "FK_referrals_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_referrals_referral_links_referral_link_id",
                        column: x => x.referral_link_id,
                        principalTable: "referral_links",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_referrals_users_referee_id",
                        column: x => x.referee_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_referrals_users_referrer_id",
                        column: x => x.referrer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_referral_links_business_id",
                table: "referral_links",
                column: "business_id");

            migrationBuilder.CreateIndex(
                name: "IX_referral_links_code",
                table: "referral_links",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_referral_links_referrer_id",
                table: "referral_links",
                column: "referrer_id");

            migrationBuilder.CreateIndex(
                name: "IX_referral_links_referrer_id_business_id",
                table: "referral_links",
                columns: new[] { "referrer_id", "business_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_referral_programs_business_id",
                table: "referral_programs",
                column: "business_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_referrals_business_id_status",
                table: "referrals",
                columns: new[] { "business_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_referrals_expires_at",
                table: "referrals",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_referrals_referee_id",
                table: "referrals",
                column: "referee_id");

            migrationBuilder.CreateIndex(
                name: "IX_referrals_referee_id_business_id",
                table: "referrals",
                columns: new[] { "referee_id", "business_id" },
                unique: true,
                filter: "\"status\" NOT IN ('Expired')");

            migrationBuilder.CreateIndex(
                name: "IX_referrals_referral_link_id",
                table: "referrals",
                column: "referral_link_id");

            migrationBuilder.CreateIndex(
                name: "IX_referrals_referrer_id",
                table: "referrals",
                column: "referrer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "referral_programs");

            migrationBuilder.DropTable(
                name: "referrals");

            migrationBuilder.DropTable(
                name: "referral_links");
        }
    }
}
