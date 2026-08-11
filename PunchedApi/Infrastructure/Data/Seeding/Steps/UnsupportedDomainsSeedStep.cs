namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class UnsupportedDomainsSeedStep : ISeedStep
{
    public string Name => "UnsupportedDomains";

    public Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var messages = new[]
        {
            "RoleSeeder skipped: no role table exists (enum-only role model).",
            "PermissionSeeder skipped: no permission tables exist.",
            "ServiceSeeder skipped: services schema not implemented.",
            "AppointmentSeeder skipped: appointments schema not implemented.",
            "PaymentSeeder skipped: payment/invoice schema not implemented.",
            "InventorySeeder skipped: inventory schema not implemented.",
            "ReviewSeeder skipped: reviews schema not implemented.",
            "NotificationSeeder skipped: persisted notification schema not implemented.",
            "AuditSeeder skipped: audit log schema not implemented.",
        };

        foreach (var message in messages)
        {
            context.Report.Warnings.Add(message);
            context.Logger.LogInformation("{Message}", message);
        }

        return Task.CompletedTask;
    }
}
