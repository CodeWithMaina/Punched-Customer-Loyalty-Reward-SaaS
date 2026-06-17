using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "qr_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qr_tokens", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_auth",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    failed_login_attempts = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0),
                    locked_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    verification_code = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    verification_code_expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    verification_code_attempts = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_auth", x => x.id);
                    table.UniqueConstraint("AK_user_auth_email", x => x.email);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_auth_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "FK_refresh_tokens_user_auth_user_auth_id",
                        column: x => x.user_auth_id,
                        principalTable: "user_auth",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_user_auth_email",
                        column: x => x.email,
                        principalTable: "user_auth",
                        principalColumn: "email",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "businesses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    location = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    logo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    mpesa_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_businesses", x => x.id);
                    table.ForeignKey(
                        name: "FK_businesses_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "loyalty_programs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stamps_required = table.Column<int>(type: "integer", nullable: false),
                    reward_value = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    reward_description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loyalty_programs", x => x.id);
                    table.CheckConstraint("chk_program_reward_value_positive", "\"reward_value\" > 0");
                    table.CheckConstraint("chk_stamps_required_positive", "\"stamps_required\" > 0");
                    table.ForeignKey(
                        name: "FK_loyalty_programs_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "loyalty_cards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    program_id = table.Column<Guid>(type: "uuid", nullable: false),
                    total_stamps = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    lifetime_stamps = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    total_redemptions = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_stamp_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    enrolled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loyalty_cards", x => x.id);
                    table.CheckConstraint("chk_lifetime_gte_total", "\"lifetime_stamps\" >= \"total_stamps\"");
                    table.CheckConstraint("chk_lifetime_stamps_gte_zero", "\"lifetime_stamps\" >= 0");
                    table.CheckConstraint("chk_total_stamps_gte_zero", "\"total_stamps\" >= 0");
                    table.ForeignKey(
                        name: "FK_loyalty_cards_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_loyalty_cards_loyalty_programs_program_id",
                        column: x => x.program_id,
                        principalTable: "loyalty_programs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_loyalty_cards_users_customer_id",
                        column: x => x.customer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "redemptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reward_value = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "pending"),
                    mpesa_ref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    redeemed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    paid_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_redemptions", x => x.id);
                    table.CheckConstraint("chk_redemption_reward_value_positive", "\"reward_value\" > 0");
                    table.ForeignKey(
                        name: "FK_redemptions_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_redemptions_loyalty_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "loyalty_cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_redemptions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "stamps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stamp_number = table.Column<short>(type: "smallint", nullable: false),
                    stamped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    qr_token_id = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stamps", x => x.id);
                    table.CheckConstraint("chk_stamp_number_positive", "\"stamp_number\" > 0");
                    table.ForeignKey(
                        name: "FK_stamps_businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "businesses",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_stamps_loyalty_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "loyalty_cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_businesses_category",
                table: "businesses",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "IX_businesses_name_location",
                table: "businesses",
                columns: new[] { "name", "location" });

            migrationBuilder.CreateIndex(
                name: "IX_businesses_owner_id",
                table: "businesses",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_business_id_last_stamp_at",
                table: "loyalty_cards",
                columns: new[] { "business_id", "last_stamp_at" });

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_customer_id",
                table: "loyalty_cards",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_customer_id_business_id",
                table: "loyalty_cards",
                columns: new[] { "customer_id", "business_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_cards_program_id",
                table: "loyalty_cards",
                column: "program_id");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_programs_business_id",
                table: "loyalty_programs",
                column: "business_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qr_tokens_customer_id_business_id",
                table: "qr_tokens",
                columns: new[] { "customer_id", "business_id" });

            migrationBuilder.CreateIndex(
                name: "IX_qr_tokens_expires_at",
                table: "qr_tokens",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_qr_tokens_token_hash",
                table: "qr_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_business_id_redeemed_at",
                table: "redemptions",
                columns: new[] { "business_id", "redeemed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_card_id_redeemed_at",
                table: "redemptions",
                columns: new[] { "card_id", "redeemed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_status",
                table: "redemptions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_UserId",
                table: "redemptions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_expires_at",
                table: "refresh_tokens",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_token",
                table: "refresh_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_user_auth_id",
                table: "refresh_tokens",
                column: "user_auth_id");

            migrationBuilder.CreateIndex(
                name: "IX_stamps_BusinessId",
                table: "stamps",
                column: "BusinessId");

            migrationBuilder.CreateIndex(
                name: "IX_stamps_card_id",
                table: "stamps",
                column: "card_id");

            migrationBuilder.CreateIndex(
                name: "IX_stamps_card_id_stamped_at",
                table: "stamps",
                columns: new[] { "card_id", "stamped_at" });

            migrationBuilder.CreateIndex(
                name: "IX_stamps_qr_token_id",
                table: "stamps",
                column: "qr_token_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_auth_created_at",
                table: "user_auth",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_user_auth_email",
                table: "user_auth",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_full_name_email",
                table: "users",
                columns: new[] { "full_name", "email" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "qr_tokens");

            migrationBuilder.DropTable(
                name: "redemptions");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "stamps");

            migrationBuilder.DropTable(
                name: "loyalty_cards");

            migrationBuilder.DropTable(
                name: "loyalty_programs");

            migrationBuilder.DropTable(
                name: "businesses");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "user_auth");
        }
    }
}
