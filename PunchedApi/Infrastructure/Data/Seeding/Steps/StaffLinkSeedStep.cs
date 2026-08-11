namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class StaffLinkSeedStep : ISeedStep
{
    public string Name => "StaffLink";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        foreach (var business in context.Scenario.Businesses)
        {
            var businessEntity = context.BusinessesByKey[business.Key];
            foreach (var staffKey in business.StaffUserKeys)
            {
                var staff = context.UsersByKey[staffKey];
                staff.StaffBusinessId = businessEntity.Id;
            }
        }

        await context.Db.SaveChangesAsync(cancellationToken);

        var linked = context.UsersByKey.Values.Count(u => u.Role == Domain.Entities.UserRole.Staff && u.StaffBusinessId != null);
        context.Report.Counts["StaffLinked"] = linked;
    }
}
