using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class ReferralProgramSeedStep : ISeedStep
{
    public string Name => "ReferralPrograms";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var businessIds = context.BusinessesByKey.Values.Select(b => b.Id).ToList();
        var existing = await context.Db.ReferralPrograms
            .Where(rp => businessIds.Contains(rp.BusinessId))
            .ToDictionaryAsync(rp => rp.BusinessId, cancellationToken);

        var created = 0;

        foreach (var businessDef in context.Scenario.Businesses)
        {
            var business = context.BusinessesByKey[businessDef.Key];

            if (!existing.TryGetValue(business.Id, out var program))
            {
                program = new Domain.Entities.ReferralProgram
                {
                    Id = DeterministicSeed.GuidFor("referral-program", businessDef.Key),
                    BusinessId = business.Id,
                    CreatedAt = businessDef.CreatedAt.AddDays(7),
                };
                context.Db.ReferralPrograms.Add(program);
                existing[business.Id] = program;
                created++;
            }

            program.ReferralsRequired = businessDef.ReferralsRequired;
            program.RewardType = businessDef.ReferralRewardType;
            program.RewardValue = businessDef.ReferralRewardValue;
            program.RewardDescription = $"Referral reward: {businessDef.ReferralRewardType}";
            program.ExpirationDays = businessDef.ReferralExpirationDays;
            program.IsActive = true;
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        context.Report.Counts["ReferralProgramsCreated"] = created;
    }
}
