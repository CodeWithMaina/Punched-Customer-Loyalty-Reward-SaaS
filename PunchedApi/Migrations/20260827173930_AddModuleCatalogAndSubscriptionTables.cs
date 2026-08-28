using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleCatalogAndSubscriptionTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "modules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "1.0.0"),
                    is_core = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    dependencies_json = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "subscription_plans",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    price = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    billing_interval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "monthly"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "business_modules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PLAN"),
                    overrides_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    overridden_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_modules", x => x.id);
                    table.ForeignKey(
                        name: "FK_business_modules_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_business_modules_modules_module_id",
                        column: x => x.module_id,
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_business_modules_users_overridden_by_user_id",
                        column: x => x.overridden_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "business_subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "active"),
                    starts_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ends_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    canceled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_business_subscriptions_businesses_business_id",
                        column: x => x.business_id,
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_business_subscriptions_subscription_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "plan_modules",
                columns: table => new
                {
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_modules", x => new { x.plan_id, x.module_id });
                    table.ForeignKey(
                        name: "FK_plan_modules_modules_module_id",
                        column: x => x.module_id,
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_plan_modules_subscription_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "subscription_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_business_modules_business_module",
                table: "business_modules",
                columns: new[] { "business_id", "module_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_business_modules_module_id",
                table: "business_modules",
                column: "module_id");

            migrationBuilder.CreateIndex(
                name: "IX_business_modules_overridden_by_user_id",
                table: "business_modules",
                column: "overridden_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_business_subscriptions_business_id",
                table: "business_subscriptions",
                column: "business_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_business_subscriptions_plan_id",
                table: "business_subscriptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "ix_business_subscriptions_status",
                table: "business_subscriptions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_modules_key",
                table: "modules",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plan_modules_module_id",
                table: "plan_modules",
                column: "module_id");

            migrationBuilder.CreateIndex(
                name: "ix_subscription_plans_key",
                table: "subscription_plans",
                column: "key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "business_modules");

            migrationBuilder.DropTable(
                name: "business_subscriptions");

            migrationBuilder.DropTable(
                name: "plan_modules");

            migrationBuilder.DropTable(
                name: "modules");

            migrationBuilder.DropTable(
                name: "subscription_plans");
        }
    }
}
