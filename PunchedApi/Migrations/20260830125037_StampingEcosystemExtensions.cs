using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class StampingEcosystemExtensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_redemptions_status_next_retry_at",
                table: "redemptions");

            // Postgres cannot auto-cast varchar -> integer, so we must backfill the
            // legacy free-text status before changing the column type, using an
            // explicit USING expression. Values are mapped to the RedemptionStatus
            // enum (Pending=0, Fulfilled=1, Cancelled=2) with the same case-insensitive
            // mapping that RedemptionStatusExtensions.FromApiString uses for the API.
            // This single-statement form avoids the Npgsql multi-statement restriction.
            migrationBuilder.Sql("""
                ALTER TABLE redemptions
                    ALTER COLUMN status DROP DEFAULT,
                    ALTER COLUMN status TYPE integer
                    USING CASE LOWER(status)
                        WHEN 'pending' THEN 0
                        WHEN 'processing' THEN 0
                        WHEN 'fulfilled' THEN 1
                        WHEN 'completed' THEN 1
                        WHEN 'cancelled' THEN 2
                        WHEN 'failed' THEN 2
                        ELSE 0
                    END,
                    ALTER COLUMN status SET DEFAULT 0;
                """);

            migrationBuilder.AddColumn<bool>(
                name: "code_locked",
                table: "redemptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "failed_attempts",
                table: "redemptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "fulfilled_at",
                table: "redemptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "fulfilled_by_user_id",
                table: "redemptions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fulfilment_code_hash",
                table: "redemptions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payout_status",
                table: "redemptions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "stamps_consumed",
                table: "redemptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "max_stamps_per_visit",
                table: "loyalty_programs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "stamp_expiry_days",
                table: "loyalty_programs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "idempotency_keys",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    response_json = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idempotency_keys", x => x.id);
                    table.ForeignKey(
                        name: "FK_idempotency_keys_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stamp_adjustments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    adjusted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    adjusted_by_role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    delta = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<int>(type: "integer", nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    related_stamp_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stamp_adjustments", x => x.id);
                    table.CheckConstraint("chk_stamp_adjustment_delta_nonzero", "\"delta\" <> 0");
                    table.ForeignKey(
                        name: "FK_stamp_adjustments_loyalty_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "loyalty_cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stamp_adjustments_users_adjusted_by_user_id",
                        column: x => x.adjusted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_CardId_Status",
                table: "redemptions",
                columns: new[] { "card_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_FulfilledByUserId",
                table: "redemptions",
                column: "fulfilled_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_payout_status_next_retry_at",
                table: "redemptions",
                columns: new[] { "payout_status", "next_retry_at" });

            migrationBuilder.AddCheckConstraint(
                name: "chk_redemption_status_valid",
                table: "redemptions",
                sql: "\"status\" IN (0, 1, 2)");

            migrationBuilder.AddCheckConstraint(
                name: "chk_program_max_stamps_per_visit_positive",
                table: "loyalty_programs",
                sql: "\"max_stamps_per_visit\" >= 1");

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_keys_ExpiresAt",
                table: "idempotency_keys",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_keys_key",
                table: "idempotency_keys",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_keys_user_id",
                table: "idempotency_keys",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_stamp_adjustments_adjusted_by_user_id",
                table: "stamp_adjustments",
                column: "adjusted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_stamp_adjustments_CardId_CreatedAt",
                table: "stamp_adjustments",
                columns: new[] { "card_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_redemptions_users_fulfilled_by_user_id",
                table: "redemptions",
                column: "fulfilled_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_redemptions_users_fulfilled_by_user_id",
                table: "redemptions");

            migrationBuilder.DropTable(
                name: "idempotency_keys");

            migrationBuilder.DropTable(
                name: "stamp_adjustments");

            migrationBuilder.DropIndex(
                name: "IX_redemptions_CardId_Status",
                table: "redemptions");

            migrationBuilder.DropIndex(
                name: "IX_redemptions_FulfilledByUserId",
                table: "redemptions");

            migrationBuilder.DropIndex(
                name: "IX_redemptions_payout_status_next_retry_at",
                table: "redemptions");

            migrationBuilder.DropCheckConstraint(
                name: "chk_redemption_status_valid",
                table: "redemptions");

            migrationBuilder.DropCheckConstraint(
                name: "chk_program_max_stamps_per_visit_positive",
                table: "loyalty_programs");

            migrationBuilder.DropColumn(
                name: "code_locked",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "failed_attempts",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "fulfilled_at",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "fulfilled_by_user_id",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "fulfilment_code_hash",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "payout_status",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "stamps_consumed",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "max_stamps_per_visit",
                table: "loyalty_programs");

            migrationBuilder.DropColumn(
                name: "stamp_expiry_days",
                table: "loyalty_programs");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "redemptions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "pending",
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_status_next_retry_at",
                table: "redemptions",
                columns: new[] { "status", "next_retry_at" });
        }
    }
}
