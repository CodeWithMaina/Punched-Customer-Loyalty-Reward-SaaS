using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Settings;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class DatabasePreparationSeedStep : ISeedStep
{
    public string Name => "DatabasePreparation";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var mode = context.Report.Mode;

        if (mode == SeedExecutionMode.ResetDatabase)
        {
            context.Logger.LogInformation("Reset mode enabled. Recreating database from migrations.");
            await context.Db.Database.EnsureDeletedAsync(cancellationToken);
            await context.Db.Database.MigrateAsync(cancellationToken);
            context.Report.Warnings.Add("Database reset executed before seeding.");
            return;
        }

        if (mode != SeedExecutionMode.ClearExistingData)
        {
            return;
        }

        context.Logger.LogInformation("ClearExistingData mode enabled. Removing previously seeded tenant data.");

        await context.Db.Referrals.ExecuteDeleteAsync(cancellationToken);
        await context.Db.ReferralLinks.ExecuteDeleteAsync(cancellationToken);
        await context.Db.ReferralPrograms.ExecuteDeleteAsync(cancellationToken);

        await context.Db.Redemptions.ExecuteDeleteAsync(cancellationToken);
        await context.Db.Stamps.ExecuteDeleteAsync(cancellationToken);
        await context.Db.QrTokens.ExecuteDeleteAsync(cancellationToken);
        await context.Db.LoyaltyCards.ExecuteDeleteAsync(cancellationToken);
        await context.Db.LoyaltyPrograms.ExecuteDeleteAsync(cancellationToken);

        await context.Db.Businesses.ExecuteDeleteAsync(cancellationToken);
        await context.Db.RefreshTokens.ExecuteDeleteAsync(cancellationToken);

        await context.Db.Users.Where(u => u.Role != Domain.Entities.UserRole.Admin).ExecuteDeleteAsync(cancellationToken);
        await context.Db.UserAuths.Where(a => a.Email != "admin@gmail.com").ExecuteDeleteAsync(cancellationToken);

        context.Report.Warnings.Add("Existing non-admin tenant data was cleared before seeding.");
    }
}
