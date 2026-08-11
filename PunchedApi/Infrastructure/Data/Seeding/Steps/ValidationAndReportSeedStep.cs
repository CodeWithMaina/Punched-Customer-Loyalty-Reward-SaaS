using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class ValidationAndReportSeedStep : ISeedStep
{
    public string Name => "ValidationAndReport";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var duplicateUserEmails = await context.Db.Users
            .GroupBy(u => u.Email)
            .Where(g => g.Count() > 1)
            .CountAsync(cancellationToken);

        var duplicateAuthEmails = await context.Db.UserAuths
            .GroupBy(a => a.Email)
            .Where(g => g.Count() > 1)
            .CountAsync(cancellationToken);

        var duplicateCards = await context.Db.LoyaltyCards
            .GroupBy(c => new { c.CustomerId, c.BusinessId })
            .Where(g => g.Count() > 1)
            .CountAsync(cancellationToken);

        if (duplicateUserEmails > 0 || duplicateAuthEmails > 0 || duplicateCards > 0)
        {
            throw new InvalidOperationException("Seed validation failed: duplicate key records detected.");
        }

        var businessIds = context.BusinessesByKey.Values.Select(b => b.Id).ToList();
        var fkIntegrity = await context.Db.LoyaltyCards
            .Where(c => businessIds.Contains(c.BusinessId))
            .AllAsync(c => context.Db.LoyaltyPrograms.Any(p => p.Id == c.ProgramId), cancellationToken);

        if (!fkIntegrity)
        {
            throw new InvalidOperationException("Seed validation failed: loyalty card references a missing program.");
        }

        context.Report.Counts["BusinessesTotal"] = await context.Db.Businesses.CountAsync(cancellationToken);
        context.Report.Counts["UsersTotal"] = await context.Db.Users.CountAsync(cancellationToken);
        context.Report.Counts["CustomersTotal"] = await context.Db.Users.CountAsync(u => u.Role == Domain.Entities.UserRole.Customer, cancellationToken);
        context.Report.Counts["StaffTotal"] = await context.Db.Users.CountAsync(u => u.Role == Domain.Entities.UserRole.Staff, cancellationToken);
        context.Report.Counts["LoyaltyCardsTotal"] = await context.Db.LoyaltyCards.CountAsync(cancellationToken);
        context.Report.Counts["StampsTotal"] = await context.Db.Stamps.CountAsync(cancellationToken);
        context.Report.Counts["RedemptionsTotal"] = await context.Db.Redemptions.CountAsync(cancellationToken);
        context.Report.Counts["ReferralsTotal"] = await context.Db.Referrals.CountAsync(cancellationToken);
        context.Report.Counts["NotificationsTotal"] = 0;
        context.Report.Counts["AppointmentsTotal"] = 0;
        context.Report.Counts["InventoryRecordsTotal"] = 0;

        var limitations = new[]
        {
            "No appointment tables exist in current schema.",
            "No payment/invoice tables exist beyond loyalty redemptions.",
            "No notification tables exist; SSE events are ephemeral.",
            "No review tables exist.",
            "No inventory tables exist.",
            "No persisted audit tables exist.",
        };

        foreach (var item in limitations)
        {
            context.Report.Warnings.Add(item);
        }

        AppendCredentialGroups(context);
    }

    private static void AppendCredentialGroups(SeedExecutionContext context)
    {
        foreach (var business in context.Scenario.Businesses)
        {
            var accountKeys = new List<string> { business.OwnerUserKey };
            accountKeys.AddRange(business.StaffUserKeys);
            accountKeys.AddRange(business.CustomerUserKeys);

            var group = new SeedCredentialGroup
            {
                BusinessKey = business.Key,
                BusinessName = business.Name,
                Accounts = accountKeys
                    .Distinct(StringComparer.Ordinal)
                    .Select(key => BuildCredential(LabelForKey(key), key))
                    .ToList(),
            };

            context.Report.Credentials.Add(group);
        }
    }

    private static string LabelForKey(string key)
    {
        if (key.StartsWith("owner-", StringComparison.Ordinal))
        {
            return "Owner";
        }

        if (key.Contains("reception", StringComparison.OrdinalIgnoreCase))
        {
            return "Receptionist";
        }

        if (key.Contains("manager", StringComparison.OrdinalIgnoreCase))
        {
            return "Manager";
        }

        if (key.StartsWith("staff-", StringComparison.Ordinal))
        {
            return "Staff";
        }

        return key.EndsWith("-01", StringComparison.Ordinal) ? "Demo Customer" : "Customer";
    }

    private static SeedCredential BuildCredential(string label, string userKey)
    {
        var user = SeedCatalog.Users.Single(u => u.Key == userKey);
        return new SeedCredential(label, user.Email, user.Password);
    }
}
