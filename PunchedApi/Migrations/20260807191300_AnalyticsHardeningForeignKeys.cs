using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PunchedApi.Migrations
{
    /// <inheritdoc />
    public partial class AnalyticsHardeningForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_staff_services_service_id",
                table: "staff_services",
                column: "service_id");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_customer_id",
                table: "reviews",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_loyalty_program_history_changed_by_user_id",
                table: "loyalty_program_history",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_insights_dismissed_by",
                table: "insights",
                column: "dismissed_by");

            migrationBuilder.CreateIndex(
                name: "IX_customer_segments_customer_id",
                table: "customer_segments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_appointments_customer_id",
                table: "appointments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_appointment_status_history_changed_by_user_id",
                table: "appointment_status_history",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_api_event_logs_user_id",
                table: "api_event_logs",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_api_event_logs_businesses_tenant_id",
                table: "api_event_logs",
                column: "tenant_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_api_event_logs_users_user_id",
                table: "api_event_logs",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_appointment_status_history_appointments_appointment_id",
                table: "appointment_status_history",
                column: "appointment_id",
                principalTable: "appointments",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_appointment_status_history_users_changed_by_user_id",
                table: "appointment_status_history",
                column: "changed_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_appointments_businesses_business_id",
                table: "appointments",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_appointments_users_customer_id",
                table: "appointments",
                column: "customer_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_appointments_users_staff_user_id",
                table: "appointments",
                column: "staff_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_business_daily_analytics_businesses_business_id",
                table: "business_daily_analytics",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_segments_businesses_business_id",
                table: "customer_segments",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_segments_users_customer_id",
                table: "customer_segments",
                column: "customer_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_insights_businesses_business_id",
                table: "insights",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_insights_users_dismissed_by",
                table: "insights",
                column: "dismissed_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_loyalty_program_history_loyalty_programs_loyalty_program_id",
                table: "loyalty_program_history",
                column: "loyalty_program_id",
                principalTable: "loyalty_programs",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_loyalty_program_history_users_changed_by_user_id",
                table: "loyalty_program_history",
                column: "changed_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_notifications_businesses_business_id",
                table: "notifications",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_notifications_users_user_id",
                table: "notifications",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_reviews_businesses_business_id",
                table: "reviews",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_reviews_users_customer_id",
                table: "reviews",
                column: "customer_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_reviews_users_staff_user_id",
                table: "reviews",
                column: "staff_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_services_businesses_business_id",
                table: "services",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_daily_analytics_businesses_business_id",
                table: "staff_daily_analytics",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_daily_analytics_users_staff_user_id",
                table: "staff_daily_analytics",
                column: "staff_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_services_businesses_business_id",
                table: "staff_services",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_services_services_service_id",
                table: "staff_services",
                column: "service_id",
                principalTable: "services",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_services_users_staff_user_id",
                table: "staff_services",
                column: "staff_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_shifts_businesses_business_id",
                table: "staff_shifts",
                column: "business_id",
                principalTable: "businesses",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_shifts_users_staff_user_id",
                table: "staff_shifts",
                column: "staff_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_api_event_logs_businesses_tenant_id",
                table: "api_event_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_api_event_logs_users_user_id",
                table: "api_event_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_appointment_status_history_appointments_appointment_id",
                table: "appointment_status_history");

            migrationBuilder.DropForeignKey(
                name: "FK_appointment_status_history_users_changed_by_user_id",
                table: "appointment_status_history");

            migrationBuilder.DropForeignKey(
                name: "FK_appointments_businesses_business_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_appointments_users_customer_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_appointments_users_staff_user_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_business_daily_analytics_businesses_business_id",
                table: "business_daily_analytics");

            migrationBuilder.DropForeignKey(
                name: "FK_customer_segments_businesses_business_id",
                table: "customer_segments");

            migrationBuilder.DropForeignKey(
                name: "FK_customer_segments_users_customer_id",
                table: "customer_segments");

            migrationBuilder.DropForeignKey(
                name: "FK_insights_businesses_business_id",
                table: "insights");

            migrationBuilder.DropForeignKey(
                name: "FK_insights_users_dismissed_by",
                table: "insights");

            migrationBuilder.DropForeignKey(
                name: "FK_loyalty_program_history_loyalty_programs_loyalty_program_id",
                table: "loyalty_program_history");

            migrationBuilder.DropForeignKey(
                name: "FK_loyalty_program_history_users_changed_by_user_id",
                table: "loyalty_program_history");

            migrationBuilder.DropForeignKey(
                name: "FK_notifications_businesses_business_id",
                table: "notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_notifications_users_user_id",
                table: "notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_reviews_businesses_business_id",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_reviews_users_customer_id",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_reviews_users_staff_user_id",
                table: "reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_services_businesses_business_id",
                table: "services");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_daily_analytics_businesses_business_id",
                table: "staff_daily_analytics");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_daily_analytics_users_staff_user_id",
                table: "staff_daily_analytics");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_services_businesses_business_id",
                table: "staff_services");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_services_services_service_id",
                table: "staff_services");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_services_users_staff_user_id",
                table: "staff_services");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_shifts_businesses_business_id",
                table: "staff_shifts");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_shifts_users_staff_user_id",
                table: "staff_shifts");

            migrationBuilder.DropIndex(
                name: "IX_staff_services_service_id",
                table: "staff_services");

            migrationBuilder.DropIndex(
                name: "IX_reviews_customer_id",
                table: "reviews");

            migrationBuilder.DropIndex(
                name: "IX_loyalty_program_history_changed_by_user_id",
                table: "loyalty_program_history");

            migrationBuilder.DropIndex(
                name: "IX_insights_dismissed_by",
                table: "insights");

            migrationBuilder.DropIndex(
                name: "IX_customer_segments_customer_id",
                table: "customer_segments");

            migrationBuilder.DropIndex(
                name: "IX_appointments_customer_id",
                table: "appointments");

            migrationBuilder.DropIndex(
                name: "IX_appointment_status_history_changed_by_user_id",
                table: "appointment_status_history");

            migrationBuilder.DropIndex(
                name: "IX_api_event_logs_user_id",
                table: "api_event_logs");
        }
    }
}
