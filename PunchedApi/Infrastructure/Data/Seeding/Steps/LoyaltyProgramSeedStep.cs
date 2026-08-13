using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class LoyaltyProgramSeedStep : ISeedStep
{
    public string Name => "LoyaltyPrograms";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var businessIds = context.BusinessesByKey.Values.Select(b => b.Id).ToList();
        var existing = await context.Db.LoyaltyPrograms
            .Where(p => businessIds.Contains(p.BusinessId))
            .ToListAsync(cancellationToken);

        var created = 0;

        foreach (var businessDef in context.Scenario.Businesses)
        {
            var business = context.BusinessesByKey[businessDef.Key];

            for (var index = 0; index < businessDef.ProgramNames.Length; index++)
            {
                var name = businessDef.ProgramNames[index];
                var isActive = index == 0;

                var program = existing.FirstOrDefault(p => p.BusinessId == business.Id && p.Name == name);
                if (program == null)
                {
                    program = new Domain.Entities.LoyaltyProgram
                    {
                        Id = DeterministicSeed.GuidFor("program", $"{businessDef.Key}:{name}"),
                        BusinessId = business.Id,
                        CreatedAt = businessDef.CreatedAt.AddDays(index + 2),
                    };
                    context.Db.LoyaltyPrograms.Add(program);
                    existing.Add(program);
                    created++;
                }

                program.Name = name;
                program.IsActive = isActive;
                program.StampsRequired = Math.Max(1, businessDef.StampsRequired + (isActive ? 0 : 2));
                program.RewardValue = businessDef.RewardValue + (isActive ? 0m : 350m);
                program.RewardDescription = isActive
                    ? businessDef.RewardDescription
                    : $"{businessDef.RewardDescription} - Premium Tier";
                program.RewardExpirationHours = isActive
                    ? businessDef.RewardExpirationHours
                    : businessDef.RewardExpirationHours + 24;

                // Vary the welcome-stamp bonus per business to exercise the
                // configurable default-enrollment-stamps feature in seed data.
                program.DefaultEnrollmentStamps = isActive
                    ? Math.Clamp(business.Id.GetHashCode() % 3 + 1, 0, 3)
                    : 0;

                if (isActive)
                {
                    context.ActiveProgramsByBusiness[business.Id] = program;
                }

                // Create initial program history entry for backfill/analytics accuracy
                var existingHistory = await context.Db.LoyaltyProgramHistory
                    .FirstOrDefaultAsync(h => h.LoyaltyProgramId == program.Id, cancellationToken);

                if (existingHistory == null)
                {
                    context.Db.LoyaltyProgramHistory.Add(new Domain.Entities.LoyaltyProgramHistory
                    {
                        Id = DeterministicSeed.GuidFor("program_history", $"{program.Id}:v1"),
                        LoyaltyProgramId = program.Id,
                        StampsRequired = program.StampsRequired,
                        RewardValue = program.RewardValue,
                        RewardDescription = program.RewardDescription,
                        EffectiveFrom = program.CreatedAt,
                        CreatedAt = program.CreatedAt
                    });
                }
            }
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        context.Report.Counts["LoyaltyProgramsCreated"] = created;
    }
}
