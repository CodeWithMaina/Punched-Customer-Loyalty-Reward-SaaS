using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class BusinessSeedStep : ISeedStep
{
    public string Name => "Business";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var ownerIds = context.Scenario.Businesses
            .Select(b => context.UsersByKey[b.OwnerUserKey].Id)
            .Distinct()
            .ToList();

        var existingByOwner = await context.Db.Businesses
            .Where(b => b.OwnerId != null && ownerIds.Contains(b.OwnerId.Value))
            .ToDictionaryAsync(b => b.OwnerId!.Value, cancellationToken);

        var existingByNameLocation = await context.Db.Businesses
            .Where(b => context.Scenario.Businesses.Select(s => s.Name).Contains(b.Name))
            .ToListAsync(cancellationToken);

        var created = 0;

        foreach (var def in context.Scenario.Businesses)
        {
            var owner = context.UsersByKey[def.OwnerUserKey];

            if (!existingByOwner.TryGetValue(owner.Id, out var business))
            {
                business = existingByNameLocation.FirstOrDefault(b => b.Name == def.Name && b.Location == def.Location);
            }

            if (business == null)
            {
                business = new Domain.Entities.Business
                {
                    Id = DeterministicSeed.GuidFor("business", def.Key),
                    CreatedAt = def.CreatedAt,
                };
                context.Db.Businesses.Add(business);
                created++;
            }

            business.Name = def.Name;
            business.Category = def.Category;
            business.Location = def.Location;
            business.PhoneNumber = def.PhoneNumber;
            business.Email = def.Email;
            business.Description = def.Description;
            business.LogoUrl = def.LogoUrl;
            business.MpesaNumber = def.MpesaNumber;
            business.OwnerId = owner.Id;

            context.BusinessesByKey[def.Key] = business;
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        context.Report.Counts["BusinessesCreated"] = created;
    }
}
