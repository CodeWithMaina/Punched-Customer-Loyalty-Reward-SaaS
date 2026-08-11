using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class CompleteAnalyticsDataInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "source_campaign",
                table: "users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source_provider",
                table: "users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "failure_reason",
                table: "redemptions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "next_retry_at",
                table: "redemptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "processing_started_at",
                table: "redemptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "processing_worker_id",
                table: "redemptions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "retry_count",
                table: "redemptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "businesses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "businesses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "api_event_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    endpoint = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    status_code = table.Column<int>(type: "integer", nullable: false),
                    duration_ms = table.Column<int>(type: "integer", nullable: false),
                    error_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_api_event_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "appointment_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    appointment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointment_status_history", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "appointments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointments", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "business_daily_analytics",
                columns: table => new
                {
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    stamps = table.Column<int>(type: "integer", nullable: false),
                    distinct_customers = table.Column<int>(type: "integer", nullable: false),
                    new_enrollments = table.Column<int>(type: "integer", nullable: false),
                    redemptions = table.Column<int>(type: "integer", nullable: false),
                    payout_kes = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    accrued_liability_kes = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    reward_ready_customers = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_business_daily_analytics", x => new { x.business_id, x.date });
                });

            migrationBuilder.CreateTable(
                name: "customer_segments",
                columns: table => new
                {
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    segment = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    computed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_stamp_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_segments", x => new { x.business_id, x.customer_id });
                    table.CheckConstraint("chk_customer_segment_score", "\"score\" >= 0 AND \"score\" <= 100");
                });

            migrationBuilder.CreateTable(
                name: "insights",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    audience = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: true),
                    category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    metric = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    severity = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    confidence = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    recommendation = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    data_json = table.Column<string>(type: "jsonb", nullable: false),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    dismissed = table.Column<bool>(type: "boolean", nullable: false),
                    dismissed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    dismissed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_insights", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loyalty_program_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    loyalty_program_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stamps_required = table.Column<int>(type: "integer", nullable: false),
                    reward_value = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    reward_description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    changed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loyalty_program_history", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: true),
                    channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    template_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    opened_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    rating = table.Column<int>(type: "integer", nullable: false),
                    comment = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reviews", x => x.id);
                    table.CheckConstraint("chk_review_rating", "\"rating\" >= 1 AND \"rating\" <= 5");
                });

            migrationBuilder.CreateTable(
                name: "services",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "staff_daily_analytics",
                columns: table => new
                {
                    staff_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    stamps = table.Column<int>(type: "integer", nullable: false),
                    distinct_customers = table.Column<int>(type: "integer", nullable: false),
                    new_customers = table.Column<int>(type: "integer", nullable: false),
                    reward_ready_created = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_daily_analytics", x => new { x.staff_user_id, x.business_id, x.date });
                });

            migrationBuilder.CreateTable(
                name: "staff_services",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_services", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "staff_shifts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_hour = table.Column<int>(type: "integer", nullable: false),
                    end_hour = table.Column<int>(type: "integer", nullable: false),
                    is_working = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_shifts", x => x.id);
                    table.CheckConstraint("chk_staff_shift_end_hour", "\"end_hour\" >= 0 AND \"end_hour\" <= 23");
                    table.CheckConstraint("chk_staff_shift_start_hour", "\"start_hour\" >= 0 AND \"start_hour\" <= 23");
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_is_deleted",
                table: "users",
                column: "is_deleted");

            migrationBuilder.CreateIndex(
                name: "IX_redemptions_status_next_retry_at",
                table: "redemptions",
                columns: new[] { "status", "next_retry_at" });

            migrationBuilder.CreateIndex(
                name: "IX_businesses_owner_id_is_deleted",
                table: "businesses",
                columns: new[] { "owner_id", "is_deleted" });

            migrationBuilder.CreateIndex(
                name: "IX_api_event_logs_created_at",
                table: "api_event_logs",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_api_event_logs_status_code",
                table: "api_event_logs",
                column: "status_code");

            migrationBuilder.CreateIndex(
                name: "IX_api_event_logs_tenant_id_created_at",
                table: "api_event_logs",
                columns: new[] { "tenant_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_appointment_status_history_appointment_id_changed_at",
                table: "appointment_status_history",
                columns: new[] { "appointment_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_business_id_scheduled_at",
                table: "appointments",
                columns: new[] { "business_id", "scheduled_at" });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_staff_user_id_scheduled_at",
                table: "appointments",
                columns: new[] { "staff_user_id", "scheduled_at" });

            migrationBuilder.CreateIndex(
                name: "IX_business_daily_analytics_business_id_date",
                table: "business_daily_analytics",
                columns: new[] { "business_id", "date" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_customer_segments_business_id_customer_id",
                table: "customer_segments",
                columns: new[] { "business_id", "customer_id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_segments_business_id_segment",
                table: "customer_segments",
                columns: new[] { "business_id", "segment" });

            migrationBuilder.CreateIndex(
                name: "IX_insights_audience_business_id_generated_at",
                table: "insights",
                columns: new[] { "audience", "business_id", "generated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_insights_business_id_dismissed_severity",
                table: "insights",
                columns: new[] { "business_id", "dismissed", "severity" });

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_program_history_loyalty_program_id_effective_from",
                table: "loyalty_program_history",
                columns: new[] { "loyalty_program_id", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_business_id_template_type",
                table: "notifications",
                columns: new[] { "business_id", "template_type" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_status_sent_at",
                table: "notifications",
                columns: new[] { "status", "sent_at" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_user_id_sent_at",
                table: "notifications",
                columns: new[] { "user_id", "sent_at" });

            migrationBuilder.CreateIndex(
                name: "IX_reviews_business_id_created_at",
                table: "reviews",
                columns: new[] { "business_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_reviews_staff_user_id_created_at",
                table: "reviews",
                columns: new[] { "staff_user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_services_business_id_is_active",
                table: "services",
                columns: new[] { "business_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_daily_analytics_business_id_date",
                table: "staff_daily_analytics",
                columns: new[] { "business_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_daily_analytics_staff_user_id_date",
                table: "staff_daily_analytics",
                columns: new[] { "staff_user_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_services_business_id_service_id",
                table: "staff_services",
                columns: new[] { "business_id", "service_id" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_services_staff_user_id_business_id",
                table: "staff_services",
                columns: new[] { "staff_user_id", "business_id" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_shifts_business_id_date",
                table: "staff_shifts",
                columns: new[] { "business_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_shifts_staff_user_id_date",
                table: "staff_shifts",
                columns: new[] { "staff_user_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "api_event_logs");

            migrationBuilder.DropTable(
                name: "appointment_status_history");

            migrationBuilder.DropTable(
                name: "appointments");

            migrationBuilder.DropTable(
                name: "business_daily_analytics");

            migrationBuilder.DropTable(
                name: "customer_segments");

            migrationBuilder.DropTable(
                name: "insights");

            migrationBuilder.DropTable(
                name: "loyalty_program_history");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "services");

            migrationBuilder.DropTable(
                name: "staff_daily_analytics");

            migrationBuilder.DropTable(
                name: "staff_services");

            migrationBuilder.DropTable(
                name: "staff_shifts");

            migrationBuilder.DropIndex(
                name: "IX_users_is_deleted",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_redemptions_status_next_retry_at",
                table: "redemptions");

            migrationBuilder.DropIndex(
                name: "IX_businesses_owner_id_is_deleted",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "users");

            migrationBuilder.DropColumn(
                name: "source_campaign",
                table: "users");

            migrationBuilder.DropColumn(
                name: "source_provider",
                table: "users");

            migrationBuilder.DropColumn(
                name: "failure_reason",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "next_retry_at",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "processing_started_at",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "processing_worker_id",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "retry_count",
                table: "redemptions");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "businesses");
        }
    }
}
